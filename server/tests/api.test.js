const request = require('supertest');
const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');
const app = require('../src/app');
const User = require('../src/models/User');
const Organization = require('../src/models/Organization');
const Dependent = require('../src/models/Dependent');
const VaccineDefinition = require('../src/models/VaccineDefinition');
const VaccineSchedule = require('../src/models/VaccineSchedule');
const ImmunizationRecord = require('../src/models/ImmunizationRecord');
const Notification = require('../src/models/Notification');
const { createNotification } = require('../src/services/notificationService');

let mongoServer;

beforeAll(async () => {
  mongoServer = await MongoMemoryServer.create();
  const uri = mongoServer.getUri();
  await mongoose.connect(uri);

  // Seed sample vaccine definitions
  await VaccineDefinition.create({
    name: 'BCG',
    code: 'BCG',
    diseaseTarget: 'Tuberculosis',
    description: 'BCG childhood vaccine',
    applicableAgeGroups: ['child', 'all'],
    doses: [
      {
        doseNumber: 1,
        doseLabel: 'Dose 1',
        recommendedAgeText: 'At birth',
        offsetDaysFromBirth: 0
      }
    ]
  });

  await VaccineDefinition.create({
    name: 'Hepatitis B',
    code: 'HEPB',
    diseaseTarget: 'Hepatitis B',
    description: 'Hep B vaccine',
    applicableAgeGroups: ['child', 'all'],
    doses: [
      {
        doseNumber: 1,
        doseLabel: 'Dose 1',
        recommendedAgeText: 'At birth',
        offsetDaysFromBirth: 0
      },
      {
        doseNumber: 2,
        doseLabel: 'Dose 2',
        recommendedAgeText: '6 weeks',
        offsetDaysFromBirth: 42
      }
    ]
  });
});

afterAll(async () => {
  await mongoose.disconnect();
  await mongoServer.stop();
});

describe('VaxaGuard Core API & Security Test Suite', () => {
  let user1Token;
  let user1Id;
  let user2Token;
  let user2Id;
  let dependent1Id;
  let ngoToken;
  let orgId;

  // 1. Registration and Login
  test('POST /api/auth/register - Successfully registers user and hashes password', async () => {
    const res = await request(app)
      .post('/api/auth/register')
      .send({
        name: 'Test Parent',
        email: 'parent@test.com',
        password: 'password123',
        role: 'parent'
      });

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.token).toBeDefined();
    expect(res.body.user.name).toBe('Test Parent');

    user1Token = res.body.token;
    user1Id = res.body.user.id;

    // Verify password is not plaintext in DB
    const dbUser = await User.findById(user1Id);
    expect(dbUser.passwordHash).not.toBe('password123');
    expect(dbUser.passwordHash).toMatch(/^\$2[aby]\$/);
  });

  test('POST /api/auth/login - Successfully logs in with valid credentials', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({
        email: 'parent@test.com',
        password: 'password123'
      });

    expect(res.status).toBe(200);
    expect(res.body.token).toBeDefined();
  });

  test('POST /api/auth/login - Rejects invalid password', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({
        email: 'parent@test.com',
        password: 'wrongpassword'
      });

    expect(res.status).toBe(401);
    expect(res.body.success).toBe(false);
  });

  // Create second user for boundary testing
  test('Setup second user for ownership boundaries', async () => {
    const res = await request(app)
      .post('/api/auth/register')
      .send({
        name: 'Second Parent',
        email: 'parent2@test.com',
        password: 'password123',
        role: 'parent'
      });
    user2Token = res.body.token;
    user2Id = res.body.user.id;
  });

  // 2. Dependent Creation and Dynamic Schedule Generation
  test('POST /api/dependents - Creates dependent and generates schedule', async () => {
    const res = await request(app)
      .post('/api/dependents')
      .set('Authorization', `Bearer ${user1Token}`)
      .send({
        name: 'Baby Aarav',
        dateOfBirth: '2025-01-01',
        gender: 'Male',
        relationship: 'Child'
      });

    expect(res.status).toBe(201);
    expect(res.body.data.name).toBe('Baby Aarav');
    dependent1Id = res.body.data._id;

    // Verify schedules were auto-generated
    const schedules = await VaccineSchedule.find({ dependentId: dependent1Id });
    expect(schedules.length).toBeGreaterThanOrEqual(2);
    expect(schedules.some(s => s.vaccineName === 'BCG')).toBe(true);
  });

  // 3. Unauthorized Cross-Account Access Check
  test('GET /api/dependents/:id - User 2 cannot access User 1 dependent', async () => {
    const res = await request(app)
      .get(`/api/dependents/${dependent1Id}`)
      .set('Authorization', `Bearer ${user2Token}`);

    expect(res.status).toBe(403);
    expect(res.body.success).toBe(false);
  });

  // 4. Vaccination Record Creation and Schedule Completion
  test('POST /api/records - Logs vaccination and updates schedule dose to completed', async () => {
    const bcgDef = await VaccineDefinition.findOne({ code: 'BCG' });

    const res = await request(app)
      .post('/api/records')
      .set('Authorization', `Bearer ${user1Token}`)
      .send({
        dependentId: dependent1Id,
        vaccineDefinitionId: bcgDef._id,
        vaccineName: 'BCG',
        doseNumber: 1,
        administeredAt: '2025-01-02',
        clinic: 'Rainbow Children Hospital',
        healthcareProfessional: 'Dr. Rao'
      });

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);

    // Verify schedule was marked completed
    const schedule = await VaccineSchedule.findOne({
      dependentId: dependent1Id,
      vaccineDefinitionId: bcgDef._id,
      doseNumber: 1
    });

    expect(schedule.status).toBe('completed');
    expect(schedule.linkedRecordId).toBeDefined();
  });

  // 5. PDF Generation Route
  test('GET /api/records/dependent/:id/pdf - Downloads immunization PDF', async () => {
    const res = await request(app)
      .get(`/api/records/dependent/${dependent1Id}/pdf`)
      .set('Authorization', `Bearer ${user1Token}`);

    expect(res.status).toBe(200);
    expect(res.headers['content-type']).toBe('application/pdf');
    expect(res.body).toBeDefined();
  });

  // 6. Notification Deduplication
  test('createNotification - Idempotent notification creation prevents duplicates', async () => {
    const dedupKey = `test_dedup_key_${Date.now()}`;

    const notif1 = await createNotification({
      recipientId: user1Id,
      title: 'Due Soon Reminder',
      message: 'Test message',
      deduplicationKey: dedupKey
    });

    const notif2 = await createNotification({
      recipientId: user1Id,
      title: 'Due Soon Reminder Duplicate',
      message: 'Duplicate text',
      deduplicationKey: dedupKey
    });

    expect(notif1._id.toString()).toBe(notif2._id.toString());
  });

  // 7. Organization and Beneficiary Workflow
  test('POST /api/auth/register (NGO) - Registers coordinator and creates organization', async () => {
    const res = await request(app)
      .post('/api/auth/register')
      .send({
        name: 'NGO Admin',
        email: 'ngo@orphanage.org',
        password: 'password123',
        role: 'ngo_coordinator',
        organizationName: 'City Children Haven'
      });

    expect(res.status).toBe(201);
    expect(res.body.user.role).toBe('ngo_coordinator');
    expect(res.body.user.organizationId).toBeDefined();

    ngoToken = res.body.token;
    orgId = res.body.user.organizationId;
  });

  test('POST /api/organizations/beneficiaries - Adds beneficiary under institution care', async () => {
    const res = await request(app)
      .post('/api/organizations/beneficiaries')
      .set('Authorization', `Bearer ${ngoToken}`)
      .send({
        name: 'Anaya',
        dateOfBirth: '2024-06-15',
        gender: 'Female',
        beneficiaryCode: 'BEN-009'
      });

    expect(res.status).toBe(201);
    expect(res.body.data.relationship).toBe('Beneficiary');
    expect(res.body.data.organizationId).toBe(orgId);
  });
});
