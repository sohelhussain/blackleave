import { getPrismaClient } from '../dist/client.js';
import { INITIAL_SOHEL_PROFILE } from '@applyflow/types';

async function seed() {
  const prisma = getPrismaClient();
  console.log('[Seed] Seeding database with Sohel Hussain profile...');

  const user = await prisma.user.upsert({
    where: { email: INITIAL_SOHEL_PROFILE.personal.email },
    update: {},
    create: {
      email: INITIAL_SOHEL_PROFILE.personal.email,
      passwordHash: 'dummy_hash_for_dev'
    }
  });

  // Create or update profile
  const p = INITIAL_SOHEL_PROFILE.personal;
  const existingProfile = await prisma.profile.findUnique({
    where: { userId: user.id }
  });

  const profile = existingProfile
    ? await prisma.profile.update({
        where: { id: existingProfile.id },
        data: {
          fullName: p.fullName,
          firstName: p.firstName,
          lastName: p.lastName,
          preferredName: p.preferredName,
          email: p.email,
          phone: p.phone,
          city: p.city,
          state: p.state,
          country: p.country,
          pincode: p.pincode,
          linkedin: p.linkedin,
          github: p.github,
          portfolio: p.portfolio,
          summary: p.summary,
          tenthPercentage: INITIAL_SOHEL_PROFILE.school.tenthPercentage,
          twelfthPercentage: INITIAL_SOHEL_PROFILE.school.twelfthPercentage,
          twelfthStream: INITIAL_SOHEL_PROFILE.school.twelfthStream
        }
      })
    : await prisma.profile.create({
        data: {
          userId: user.id,
          fullName: p.fullName,
          firstName: p.firstName,
          lastName: p.lastName,
          preferredName: p.preferredName,
          email: p.email,
          phone: p.phone,
          city: p.city,
          state: p.state,
          country: p.country,
          pincode: p.pincode,
          linkedin: p.linkedin,
          github: p.github,
          portfolio: p.portfolio,
          summary: p.summary,
          tenthPercentage: INITIAL_SOHEL_PROFILE.school.tenthPercentage,
          twelfthPercentage: INITIAL_SOHEL_PROFILE.school.twelfthPercentage,
          twelfthStream: INITIAL_SOHEL_PROFILE.school.twelfthStream
        }
      });

  // Seed Job Preferences
  const pref = INITIAL_SOHEL_PROFILE.jobPreferences;
  await prisma.jobPreference.upsert({
    where: { profileId: profile.id },
    update: {
      targetRoles: pref.targetRoles,
      employmentTypes: pref.employmentTypes,
      preferredLocations: pref.preferredLocations,
      willingToRelocate: pref.willingToRelocate,
      willingToWorkRemotely: pref.willingToWorkRemotely,
      noticePeriod: pref.noticePeriod
    },
    create: {
      profileId: profile.id,
      targetRoles: pref.targetRoles,
      employmentTypes: pref.employmentTypes,
      preferredLocations: pref.preferredLocations,
      willingToRelocate: pref.willingToRelocate,
      willingToWorkRemotely: pref.willingToWorkRemotely,
      noticePeriod: pref.noticePeriod
    }
  });

  // Seed Work Authorization
  const auth = INITIAL_SOHEL_PROFILE.workAuthorization;
  await prisma.workAuthorization.upsert({
    where: { profileId: profile.id },
    update: {
      indiaAuthorized: auth.indiaAuthorized,
      indiaSponsorshipRequired: auth.indiaSponsorshipRequired,
      usAuthorized: auth.usAuthorized,
      usSponsorshipRequired: auth.usSponsorshipRequired,
      europeAuthorized: auth.europeAuthorized,
      europeSponsorshipRequired: auth.europeSponsorshipRequired
    },
    create: {
      profileId: profile.id,
      indiaAuthorized: auth.indiaAuthorized,
      indiaSponsorshipRequired: auth.indiaSponsorshipRequired,
      usAuthorized: auth.usAuthorized,
      usSponsorshipRequired: auth.usSponsorshipRequired,
      europeAuthorized: auth.europeAuthorized,
      europeSponsorshipRequired: auth.europeSponsorshipRequired
    }
  });

  // Seed Education
  await prisma.education.deleteMany({ where: { profileId: profile.id } });
  for (const edu of INITIAL_SOHEL_PROFILE.education) {
    await prisma.education.create({
      data: {
        profileId: profile.id,
        degree: edu.degree,
        branch: edu.branch,
        university: edu.university,
        location: edu.location,
        startDate: edu.startDate,
        endDate: edu.endDate,
        expectedGraduation: edu.expectedGraduation,
        cgpa: edu.cgpa ? String(edu.cgpa) : null
      }
    });
  }

  // Seed Experience
  await prisma.experience.deleteMany({ where: { profileId: profile.id } });
  for (const exp of INITIAL_SOHEL_PROFILE.experience) {
    await prisma.experience.create({
      data: {
        profileId: profile.id,
        company: exp.company,
        title: exp.title,
        employmentType: exp.employmentType,
        location: exp.location,
        workMode: exp.workMode,
        startDate: exp.startDate,
        endDate: exp.endDate,
        responsibilities: exp.responsibilities,
        technologies: exp.technologies
      }
    });
  }

  // Seed Projects
  await prisma.project.deleteMany({ where: { profileId: profile.id } });
  for (const proj of INITIAL_SOHEL_PROFILE.projects) {
    await prisma.project.create({
      data: {
        profileId: profile.id,
        title: proj.title,
        description: proj.description,
        technologies: proj.technologies,
        features: proj.features || [],
        securityHighlights: proj.securityHighlights || []
      }
    });
  }

  // Seed Resumes
  await prisma.resume.deleteMany({ where: { profileId: profile.id } });
  for (const res of INITIAL_SOHEL_PROFILE.resumes) {
    await prisma.resume.create({
      data: {
        profileId: profile.id,
        name: res.name,
        fileName: res.fileName,
        targetRoles: res.targetRoles,
        relevantSkills: res.relevantSkills,
        isDefault: res.isDefault
      }
    });
  }

  console.log('[Seed] Successfully seeded complete profile for Sohel Hussain!');
}

seed()
  .catch((e) => {
    console.error('[Seed] Error seeding database:', e);
    process.exit(1);
  })
  .finally(async () => {
    const prisma = getPrismaClient();
    await prisma.$disconnect();
  });
