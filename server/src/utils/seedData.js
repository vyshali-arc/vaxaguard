const mongoose = require('mongoose');
const User = require('../models/User');
const Organization = require('../models/Organization');
const Dependent = require('../models/Dependent');
const VaccineDefinition = require('../models/VaccineDefinition');
const VaccineSchedule = require('../models/VaccineSchedule');
const ImmunizationRecord = require('../models/ImmunizationRecord');
const Notification = require('../models/Notification');
const { connectDB, disconnectDB } = require('../config/db');

const officialVaccines = [
  {
    name: 'BCG (Bacillus Calmette-Guérin)',
    code: 'BCG',
    diseaseTarget: 'Tuberculosis',
    description: 'Provides vital immunity against severe childhood tuberculosis and tuberculous meningitis.',
    applicableAgeGroups: ['child', 'all'],
    jurisdiction: 'Indian National Immunization Schedule (UIP)',
    sourceReference: 'Universal Immunization Programme (UIP), MoHFW, Govt. of India',
    doses: [
      {
        doseNumber: 1,
        doseLabel: 'Dose 1',
        recommendedAgeText: 'At birth',
        offsetDaysFromBirth: 0,
        notes: 'Give at birth or as early as possible within 1 year.'
      }
    ]
  },
  {
    name: 'Hepatitis B',
    code: 'HEPB',
    diseaseTarget: 'Hepatitis B Virus (Liver infection)',
    description: 'Prevents acute and chronic hepatitis B infection, chronic liver disease, and cirrhosis.',
    applicableAgeGroups: ['child', 'adult', 'all'],
    jurisdiction: 'Indian National Immunization Schedule (UIP)',
    sourceReference: 'National Immunization Guidelines, MoHFW, Govt. of India',
    doses: [
      {
        doseNumber: 1,
        doseLabel: 'Birth Dose',
        recommendedAgeText: 'At birth',
        offsetDaysFromBirth: 0,
        notes: 'Must be administered within 24 hours of birth.'
      },
      {
        doseNumber: 2,
        doseLabel: 'Dose 2',
        recommendedAgeText: '6 weeks',
        offsetDaysFromBirth: 42,
        notes: 'Given as part of Pentavalent combination.'
      },
      {
        doseNumber: 3,
        doseLabel: 'Dose 3',
        recommendedAgeText: '6 months',
        offsetDaysFromBirth: 180,
        notes: 'Completes primary childhood Hepatitis B series.'
      }
    ]
  },
  {
    name: 'OPV (Oral Polio Vaccine)',
    code: 'OPV',
    diseaseTarget: 'Poliomyelitis (Infantile Paralysis)',
    description: 'Provides mucosal gut immunity against polioviruses.',
    applicableAgeGroups: ['child', 'all'],
    jurisdiction: 'Indian National Immunization Schedule (UIP)',
    sourceReference: 'UIP India & WHO Polio Eradication Guidance',
    doses: [
      {
        doseNumber: 1,
        doseLabel: 'Dose 1',
        recommendedAgeText: '6 weeks',
        offsetDaysFromBirth: 42,
        notes: 'Along with Pentavalent-1 and Rotavirus-1.'
      },
      {
        doseNumber: 2,
        doseLabel: 'Dose 2',
        recommendedAgeText: '10 weeks',
        offsetDaysFromBirth: 70,
        notes: 'Along with Pentavalent-2.'
      },
      {
        doseNumber: 3,
        doseLabel: 'Dose 3',
        recommendedAgeText: '14 weeks',
        offsetDaysFromBirth: 98,
        notes: 'Along with Pentavalent-3 and fIPV.'
      }
    ]
  },
  {
    name: 'DPT (Diphtheria, Pertussis, Tetanus)',
    code: 'DPT',
    diseaseTarget: 'Diphtheria, Whooping Cough, Tetanus',
    description: 'Protects against respiratory diphtheria, severe whooping cough, and bacterial tetanus.',
    applicableAgeGroups: ['child', 'all'],
    jurisdiction: 'Indian National Immunization Schedule (UIP)',
    sourceReference: 'Universal Immunization Programme (UIP), Govt. of India',
    doses: [
      {
        doseNumber: 1,
        doseLabel: 'Dose 1',
        recommendedAgeText: '6 weeks',
        offsetDaysFromBirth: 42,
        notes: 'Given as Pentavalent-1.'
      },
      {
        doseNumber: 2,
        doseLabel: 'Dose 2',
        recommendedAgeText: '10 weeks',
        offsetDaysFromBirth: 70,
        notes: 'Given as Pentavalent-2.'
      },
      {
        doseNumber: 3,
        doseLabel: 'Dose 3',
        recommendedAgeText: '14 weeks',
        offsetDaysFromBirth: 98,
        notes: 'Given as Pentavalent-3.'
      },
      {
        doseNumber: 4,
        doseLabel: 'Booster 1',
        recommendedAgeText: '16–24 months',
        offsetDaysFromBirth: 540,
        notes: 'First DPT booster.'
      },
      {
        doseNumber: 5,
        doseLabel: 'Booster 2',
        recommendedAgeText: '5–6 years',
        offsetDaysFromBirth: 1825,
        notes: 'Second DPT booster before school entry.'
      }
    ]
  },
  {
    name: 'MMR (Measles, Mumps, Rubella)',
    code: 'MMR',
    diseaseTarget: 'Measles, Mumps, and Rubella',
    description: 'Highly effective live-attenuated vaccine preventing measles rash, mumps, and congenital rubella syndrome.',
    applicableAgeGroups: ['child', 'adult', 'all'],
    jurisdiction: 'Indian UIP / IAP Advisory',
    sourceReference: 'National MR Elimination Campaign & IAP Schedule',
    doses: [
      {
        doseNumber: 1,
        doseLabel: 'Dose 1',
        recommendedAgeText: '9 months',
        offsetDaysFromBirth: 270,
        notes: 'Administered between 9–12 months of age.'
      },
      {
        doseNumber: 2,
        doseLabel: 'Dose 2',
        recommendedAgeText: '16–24 months',
        offsetDaysFromBirth: 540,
        notes: 'Second dose gives lifelong protective immunity.'
      }
    ]
  },
  {
    name: 'Varicella (Chickenpox)',
    code: 'VARICELLA',
    diseaseTarget: 'Chickenpox (Varicella Zoster Virus)',
    description: 'Prevents fever, vesicular itchy blisters, and bacterial skin superinfections.',
    applicableAgeGroups: ['child', 'all'],
    jurisdiction: 'Indian Academy of Pediatrics (IAP)',
    sourceReference: 'IAP Advisory Committee on Vaccines',
    doses: [
      {
        doseNumber: 1,
        doseLabel: 'Dose 1',
        recommendedAgeText: '12 months',
        offsetDaysFromBirth: 365,
        notes: 'Administered after first birthday.'
      },
      {
        doseNumber: 2,
        doseLabel: 'Dose 2',
        recommendedAgeText: '4–6 years',
        offsetDaysFromBirth: 1825,
        notes: 'Booster dose.'
      }
    ]
  },
  {
    name: 'Typhoid Conjugate (TCV)',
    code: 'TYPHOID',
    diseaseTarget: 'Typhoid (Enteric) Fever',
    description: 'Conjugate vaccine against Salmonella typhi providing long-lasting bacterial defense.',
    applicableAgeGroups: ['child', 'adult', 'all'],
    jurisdiction: 'IAP / Indian Clinical Guidance',
    sourceReference: 'Indian Academy of Pediatrics Guidebook on Immunization',
    doses: [
      {
        doseNumber: 1,
        doseLabel: 'Dose 1',
        recommendedAgeText: '9–12 months',
        offsetDaysFromBirth: 270,
        notes: 'Single primary dose provides lasting antibodies.'
      }
    ]
  },
  {
    name: 'Tdap / Td Booster',
    code: 'TDAP',
    diseaseTarget: 'Tetanus, Diphtheria, Pertussis',
    description: 'Booster vaccine for adolescents and adults every 10 years to sustain protective antitoxin levels.',
    applicableAgeGroups: ['adult', 'senior', 'all'],
    jurisdiction: 'National Adult Immunization Guidelines',
    sourceReference: 'MoHFW & Adult Vaccination Association of India',
    doses: [
      {
        doseNumber: 1,
        doseLabel: 'Adolescent Dose',
        recommendedAgeText: '10 years',
        offsetDaysFromBirth: 3650,
        notes: 'Recommended for all children at age 10.'
      },
      {
        doseNumber: 2,
        doseLabel: 'Adult Booster',
        recommendedAgeText: 'Every 10 years',
        offsetDaysFromBirth: 7300,
        notes: 'Repeat every 10 years throughout adulthood.'
      }
    ]
  },
  {
    name: 'Influenza (Seasonal Flu)',
    code: 'FLU',
    diseaseTarget: 'Influenza Types A & B Viruses',
    description: 'Annual quadrivalent vaccine formulated against anticipated circulating respiratory influenza strains.',
    applicableAgeGroups: ['senior', 'adult', 'child', 'all'],
    jurisdiction: 'Global & Indian Clinical Advisory',
    sourceReference: 'WHO & National Influenza Center Guidelines',
    doses: [
      {
        doseNumber: 1,
        doseLabel: 'Annual Dose',
        recommendedAgeText: 'Annual (Before Monsoon / Winter)',
        offsetDaysFromBirth: 365,
        notes: 'Strongly recommended annually for senior citizens (60+) and high-risk individuals.'
      }
    ]
  },
  {
    name: 'Pneumococcal (PCV20 / PPSV23)',
    code: 'PNEUMO',
    diseaseTarget: 'Streptococcus pneumoniae (Pneumonia, Sepsis, Meningitis)',
    description: 'Critical protection for elderly adults against invasive pneumococcal disease and hospitalization.',
    applicableAgeGroups: ['senior', 'all'],
    jurisdiction: 'Geriatric Immunization Advisory',
    sourceReference: 'Indian Society of Geriatric Medicine Guidelines',
    doses: [
      {
        doseNumber: 1,
        doseLabel: 'Dose 1',
        recommendedAgeText: '60+ years',
        offsetDaysFromBirth: 21915,
        notes: 'Single dose PCV20 or PPSV23 sequence for senior citizens.'
      }
    ]
  },
  {
    name: 'Shingles (Recombinant Zoster)',
    code: 'SHINGLES',
    diseaseTarget: 'Herpes Zoster (Shingles & Postherpetic Neuralgia)',
    description: 'High-efficacy 2-dose series preventing painful shingles flare-ups and long-term nerve pain in older adults.',
    applicableAgeGroups: ['senior', 'adult'],
    jurisdiction: 'Adult & Senior Immunization Advisory',
    sourceReference: 'Indian Geriatric & Infectious Disease Societies',
    doses: [
      {
        doseNumber: 1,
        doseLabel: 'Dose 1',
        recommendedAgeText: '50+ years',
        offsetDaysFromBirth: 18262,
        notes: 'First dose.'
      },
      {
        doseNumber: 2,
        doseLabel: 'Dose 2',
        recommendedAgeText: '2–6 months after Dose 1',
        offsetDaysFromBirth: 18382,
        notes: 'Second dose completes series.'
      }
    ]
  }
];

async function seedDatabase(forceReset = false) {
  try {
    console.log('🌱 Seeding VaxaGuard Database with starter guidance & realistic fictional demo data...');

    // 1. Seed Vaccine Definitions
    for (const vacData of officialVaccines) {
      await VaccineDefinition.findOneAndUpdate(
        { code: vacData.code },
        vacData,
        { upsert: true, new: true }
      );
    }
    console.log(`✅ Loaded ${officialVaccines.length} verified vaccine definitions.`);

    // 2. Check if demo users already exist
    let parentUser = await User.findOne({ email: 'vyshali@example.com' });
    let ngoUser = await User.findOne({ email: 'hopehome@example.com' });

    if (!parentUser || forceReset) {
      if (forceReset) {
        await User.deleteMany({ email: { $in: ['vyshali@example.com', 'hopehome@example.com'] } });
      }

      // Create Parent Account: Vyshali
      parentUser = await User.create({
        name: 'Vyshali Raman',
        email: 'vyshali@example.com',
        passwordHash: 'vaxaguard123',
        role: 'parent',
        preferences: {
          emailNotifications: true,
          smsNotifications: false,
          reminderTimingDays: 7,
          notes: 'Prefer morning alerts before clinic visits.'
        }
      });
      console.log('✅ Created demo parent user: vyshali@example.com');
    }

    if (!ngoUser || forceReset) {
      // Create NGO Account & Organization
      const org = await Organization.create({
        name: 'Hope Home Orphanage',
        type: 'orphanage',
        registrationNumber: 'CH-2018-NGO-0914',
        contactEmail: 'hopehome@example.com',
        contactPhone: '+91 98765 43210',
        address: {
          street: '14 Shantivana Marg',
          city: 'Hyderabad',
          state: 'Telangana',
          country: 'India',
          pincode: '500034'
        }
      });

      ngoUser = await User.create({
        name: 'Sister Mary (Hope Home)',
        email: 'hopehome@example.com',
        passwordHash: 'vaxaguard123',
        role: 'ngo_coordinator',
        organizationId: org._id,
        organizationName: 'Hope Home Orphanage'
      });

      org.authorizedCoordinatorIds.push(ngoUser._id);
      await org.save();
      console.log('✅ Created demo NGO coordinator & organization: Hope Home Orphanage');
    }

    // 3. Create Family Members for Vyshali (Matching Mockup Panels 3, 4, 6)
    const existingFamilyCount = await Dependent.countDocuments({ accountOwnerId: parentUser._id });

    if (existingFamilyCount === 0 || forceReset) {
      // Member 1: Aarav (Child, 3 years old, DOB: 15 Jan 2023)
      const aarav = await Dependent.create({
        name: 'Aarav',
        dateOfBirth: new Date('2023-01-15'),
        gender: 'Male',
        relationship: 'Child',
        jurisdiction: 'Indian National Immunization Schedule (UIP)',
        accountOwnerId: parentUser._id,
        notes: 'Mild milk allergy. Responds well to pediatric syrup.'
      });

      // Member 2: You (Self) (Adult, 21 years old)
      const selfMember = await Dependent.create({
        name: 'You (Self)',
        dateOfBirth: new Date('2005-03-12'),
        gender: 'Female',
        relationship: 'Self',
        accountOwnerId: parentUser._id
      });

      // Member 3: Amma (Adult, 45 years old)
      const amma = await Dependent.create({
        name: 'Amma',
        dateOfBirth: new Date('1981-08-05'),
        gender: 'Female',
        relationship: 'Parent',
        accountOwnerId: parentUser._id
      });

      // Member 4: Nanna (Senior, 68 years old)
      const nanna = await Dependent.create({
        name: 'Nanna',
        dateOfBirth: new Date('1958-11-18'),
        gender: 'Male',
        relationship: 'Senior',
        accountOwnerId: parentUser._id
      });

      console.log('✅ Created 4 family members for Vyshali.');

      // Helper to link vaccine definitions
      const bcgDef = await VaccineDefinition.findOne({ code: 'BCG' });
      const hepbDef = await VaccineDefinition.findOne({ code: 'HEPB' });
      const opvDef = await VaccineDefinition.findOne({ code: 'OPV' });
      const dptDef = await VaccineDefinition.findOne({ code: 'DPT' });
      const mmrDef = await VaccineDefinition.findOne({ code: 'MMR' });
      const varicellaDef = await VaccineDefinition.findOne({ code: 'VARICELLA' });
      const fluDef = await VaccineDefinition.findOne({ code: 'FLU' });
      const pneumoDef = await VaccineDefinition.findOne({ code: 'PNEUMO' });
      const tdapDef = await VaccineDefinition.findOne({ code: 'TDAP' });

      // Seed realistic completed records for Aarav (matching Mockup Panel 6)
      const aaravCompletedRecords = [
        {
          def: bcgDef,
          name: 'BCG',
          dose: 1,
          timing: 'At birth',
          due: new Date('2023-01-15'),
          given: new Date('2023-01-15'),
          clinic: 'ABC Hospital',
          dr: 'Dr. Suresh Rao'
        },
        {
          def: hepbDef,
          name: 'Hepatitis B',
          dose: 1,
          timing: 'At birth',
          due: new Date('2023-01-15'),
          given: new Date('2023-01-16'),
          clinic: 'ABC Hospital',
          dr: 'Dr. Suresh Rao'
        },
        {
          def: hepbDef,
          name: 'Hepatitis B',
          dose: 2,
          timing: '6 weeks',
          due: new Date('2023-02-26'),
          given: new Date('2023-02-26'),
          clinic: 'City Clinic',
          dr: 'Dr. Anita Mehta'
        },
        {
          def: opvDef,
          name: 'OPV',
          dose: 1,
          timing: '6 weeks',
          due: new Date('2023-02-26'),
          given: new Date('2023-02-26'),
          clinic: 'City Clinic',
          dr: 'Dr. Anita Mehta'
        },
        {
          def: dptDef,
          name: 'DPT',
          dose: 1,
          timing: '6 weeks',
          due: new Date('2023-02-26'),
          given: new Date('2023-02-26'),
          clinic: 'City Clinic',
          dr: 'Dr. Anita Mehta'
        }
      ];

      for (const item of aaravCompletedRecords) {
        if (!item.def) continue;

        const rec = await ImmunizationRecord.create({
          dependentId: aarav._id,
          vaccineDefinitionId: item.def._id,
          vaccineName: item.name,
          doseNumber: item.dose,
          administeredAt: item.given,
          clinic: item.clinic,
          healthcareProfessional: item.dr,
          verificationStatus: 'verified_by_doctor',
          createdBy: parentUser._id
        });

        await VaccineSchedule.create({
          dependentId: aarav._id,
          vaccineDefinitionId: item.def._id,
          vaccineName: item.name,
          doseNumber: item.dose,
          recommendedTiming: item.timing,
          dueDate: item.due,
          status: 'completed',
          linkedRecordId: rec._id,
          completedAt: item.given
        });
      }

      // Aarav Due Soon & Upcoming doses (matching Mockup Panel 6)
      if (mmrDef) {
        // Due Soon: MMR Booster (due in ~10 days)
        const dueSoonDate = new Date(Date.now() + 10 * 24 * 60 * 60 * 1000);
        await VaccineSchedule.create({
          dependentId: aarav._id,
          vaccineDefinitionId: mmrDef._id,
          vaccineName: 'MMR Booster',
          doseNumber: 2,
          recommendedTiming: '16–24 months',
          dueDate: dueSoonDate,
          status: 'due_soon'
        });
      }

      if (varicellaDef) {
        // Upcoming: Varicella (due in 3 months)
        const upcomingDate = new Date(Date.now() + 90 * 24 * 60 * 60 * 1000);
        await VaccineSchedule.create({
          dependentId: aarav._id,
          vaccineDefinitionId: varicellaDef._id,
          vaccineName: 'Varicella',
          doseNumber: 1,
          recommendedTiming: '12 months',
          dueDate: upcomingDate,
          status: 'upcoming'
        });
      }

      // Seed schedules & records for You (Self), Amma, and Nanna to show realistic family metrics
      if (tdapDef) {
        await VaccineSchedule.create({
          dependentId: selfMember._id,
          vaccineDefinitionId: tdapDef._id,
          vaccineName: 'Tdap Booster',
          doseNumber: 2,
          recommendedTiming: 'Every 10 years',
          dueDate: new Date(Date.now() + 18 * 24 * 60 * 60 * 1000),
          status: 'upcoming'
        });
      }

      if (fluDef) {
        // Flu vaccine due soon for senior Nanna
        await VaccineSchedule.create({
          dependentId: nanna._id,
          vaccineDefinitionId: fluDef._id,
          vaccineName: 'Seasonal Influenza',
          doseNumber: 1,
          recommendedTiming: 'Annual',
          dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
          status: 'due_soon'
        });
      }

      if (pneumoDef) {
        await VaccineSchedule.create({
          dependentId: nanna._id,
          vaccineDefinitionId: pneumoDef._id,
          vaccineName: 'Pneumococcal (PCV20)',
          doseNumber: 1,
          recommendedTiming: '60+ years',
          dueDate: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000), // Overdue by 5 days
          status: 'overdue'
        });
      }

      // Initial in-app notification for Vyshali
      await Notification.create({
        recipientId: parentUser._id,
        dependentId: aarav._id,
        type: 'due_soon',
        title: 'Vaccination Due Soon: MMR Booster for Aarav',
        message: 'Aarav is due for MMR Booster dose in 10 days. Please schedule an appointment at your local pediatric clinic.',
        deduplicationKey: `init_aarav_mmr_${aarav._id}`,
        scheduledFor: new Date(),
        sentAt: new Date()
      });
    }

    // 4. Create NGO Beneficiaries for Hope Home Orphanage (Matching Mockup Panel 5)
    const org = await Organization.findOne({ contactEmail: 'hopehome@example.com' });
    if (org) {
      const existingBeneficiaries = await Dependent.countDocuments({ organizationId: org._id });
      if (existingBeneficiaries === 0 || forceReset) {
        const dptDef = await VaccineDefinition.findOne({ code: 'DPT' });
        const mmrDef = await VaccineDefinition.findOne({ code: 'MMR' });
        const typhoidDef = await VaccineDefinition.findOne({ code: 'TYPHOID' });
        const hepbDef = await VaccineDefinition.findOne({ code: 'HEPB' });
        const opvDef = await VaccineDefinition.findOne({ code: 'OPV' });

        const childrenData = [
          {
            name: 'Riya',
            dob: '2024-10-10',
            gender: 'Female',
            def: dptDef,
            vac: 'DPT',
            dose: 2,
            timing: '10 weeks',
            status: 'due_soon',
            daysOffset: 7
          },
          {
            name: 'Karthik',
            dob: '2023-08-15',
            gender: 'Male',
            def: mmrDef,
            vac: 'MMR',
            dose: 1,
            timing: '9 months',
            status: 'upcoming',
            daysOffset: 23
          },
          {
            name: 'Sana',
            dob: '2021-06-01',
            gender: 'Female',
            def: typhoidDef,
            vac: 'Typhoid',
            dose: 1,
            timing: '9–12 months',
            status: 'upcoming',
            daysOffset: 28
          },
          {
            name: 'Aditya',
            dob: '2025-09-20',
            gender: 'Male',
            def: hepbDef,
            vac: 'Hepatitis B',
            dose: 2,
            timing: '6 weeks',
            status: 'overdue',
            daysOffset: -3
          },
          {
            name: 'Meera',
            dob: '2022-02-14',
            gender: 'Female',
            def: opvDef,
            vac: 'OPV',
            dose: 2,
            timing: '10 weeks',
            status: 'upcoming',
            daysOffset: 18
          }
        ];

        for (const c of childrenData) {
          const child = await Dependent.create({
            name: c.name,
            dateOfBirth: new Date(c.dob),
            gender: c.gender,
            relationship: 'Beneficiary',
            accountOwnerId: ngoUser._id,
            organizationId: org._id,
            beneficiaryCode: `BEN-${c.name.toUpperCase()}-01`
          });

          if (c.def) {
            const dueDate = new Date(Date.now() + c.daysOffset * 24 * 60 * 60 * 1000);
            await VaccineSchedule.create({
              dependentId: child._id,
              vaccineDefinitionId: c.def._id,
              vaccineName: c.vac,
              doseNumber: c.dose,
              recommendedTiming: c.timing,
              dueDate,
              status: c.status
            });
          }
        }
        console.log('✅ Seeded 5 demo beneficiaries for Hope Home Orphanage matching Mockup Panel 5.');
      }
    }

    console.log('🎉 Database seeding completed successfully!');
  } catch (err) {
    console.error('Error during database seeding:', err);
  }
}

// Standalone execution if run directly via `node seedData.js`
if (require.main === module) {
  (async () => {
    await connectDB();
    await seedDatabase(process.argv.includes('--force'));
    await disconnectDB();
    process.exit(0);
  })();
}

module.exports = { seedDatabase };
