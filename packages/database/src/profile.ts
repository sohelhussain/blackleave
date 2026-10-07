import { getPrismaClient } from './client.js';
import { UserProfile, INITIAL_SOHEL_PROFILE } from '@applyflow/types';

export function mapPrismaProfileToUserProfile(p: any): UserProfile {
  if (!p) {
    return JSON.parse(JSON.stringify(INITIAL_SOHEL_PROFILE));
  }

  const jobPref = p.jobPreference || {};
  const workAuth = p.workAuthorization || {};

  const skillsObj: UserProfile['skills'] = {
    programming: [],
    frontend: [],
    backend: [],
    database: [],
    infrastructure: [],
    blockchain: [],
    realtime: [],
    auth: [],
    other: []
  };

  if (Array.isArray(p.skills)) {
    for (const s of p.skills) {
      const cat = (s.category || 'other') as keyof UserProfile['skills'];
      if (skillsObj[cat]) {
        skillsObj[cat].push(s.name);
      } else {
        skillsObj.other.push(s.name);
      }
    }
  }

  return {
    id: p.id,
    personal: {
      fullName: p.fullName || '',
      firstName: p.firstName || '',
      lastName: p.lastName || '',
      preferredName: p.preferredName || '',
      email: p.email || '',
      phone: p.phone || '',
      city: p.city || '',
      state: p.state || '',
      country: p.country || '',
      pincode: p.pincode || '',
      address: p.address || undefined,
      postalCode: p.postalCode || undefined,
      age: p.age !== null ? p.age : undefined,
      dateOfBirth: p.dateOfBirth || undefined,
      gender: p.gender || undefined,
      genderCustom: p.genderCustom || undefined,
      linkedin: p.linkedin || '',
      github: p.github || '',
      portfolio: p.portfolio || '',
      summary: p.summary || ''
    },
    jobPreferences: {
      targetRoles: jobPref.targetRoles || [],
      targetJobTitles: p.targetJobTitles || [],
      targetIndustries: p.targetIndustries || [],
      targetCareerAreas: p.targetCareerAreas || [],
      employmentStatus: p.employmentStatus || undefined,
      employmentTypes: jobPref.employmentTypes || ['Full-time'],
      workModes: ['Remote'],
      preferredLocations: jobPref.preferredLocations || [],
      willingToRelocate: jobPref.willingToRelocate ?? true,
      willingToWorkRemotely: jobPref.willingToWorkRemotely ?? true,
      noticePeriod: jobPref.noticePeriod || '15 days',
      expectedSalaryMin: jobPref.expectedSalaryMin ?? null,
      expectedSalaryMax: jobPref.expectedSalaryMax ?? null,
      salaryCurrency: jobPref.salaryCurrency || 'INR',
      studentEnrollment: p.studentEnrollment ? {
        isCurrentlyEnrolled: p.studentEnrollment.isCurrentlyEnrolled ?? true,
        institution: p.studentEnrollment.institution || '',
        degreeProgram: p.studentEnrollment.degreeProgram || '',
        fieldOfStudy: p.studentEnrollment.fieldOfStudy || '',
        currentYearSemester: p.studentEnrollment.currentYearSemester || '',
        expectedGraduationDate: p.studentEnrollment.expectedGraduationDate || '',
        openToStudyCombinedJobs: p.studentEnrollment.openToStudyCombinedJobs ?? true
      } : null
    },
    education: Array.isArray(p.education) ? p.education.map((e: any) => ({
      id: e.id,
      degree: e.degree,
      branch: e.branch,
      university: e.university,
      location: e.location,
      startDate: e.startDate,
      endDate: e.endDate || null,
      expectedGraduation: e.expectedGraduation || null,
      cgpa: e.cgpa || null,
      percentage: e.percentage || null,
      stream: e.stream || null
    })) : [],
    school: {
      tenthPercentage: p.tenthPercentage || '',
      twelfthPercentage: p.twelfthPercentage || '',
      twelfthStream: p.twelfthStream || ''
    },
    workAuthorization: {
      indiaAuthorized: workAuth.indiaAuthorized ?? true,
      indiaSponsorshipRequired: workAuth.indiaSponsorshipRequired ?? false,
      usAuthorized: workAuth.usAuthorized ?? false,
      usSponsorshipRequired: workAuth.usSponsorshipRequired ?? true,
      europeAuthorized: workAuth.europeAuthorized ?? false,
      europeSponsorshipRequired: workAuth.europeSponsorshipRequired ?? true,
      countries: Array.isArray(p.countryAuthorizations) ? p.countryAuthorizations.map((c: any) => ({
        countryCode: c.countryCode,
        countryName: c.countryName,
        status: c.status,
        visaType: c.visaType || undefined
      })) : []
    },
    experience: Array.isArray(p.experience) ? p.experience.map((ex: any) => ({
      id: ex.id,
      company: ex.company,
      title: ex.title,
      employmentType: ex.employmentType,
      location: ex.location,
      workMode: ex.workMode,
      startDate: ex.startDate,
      endDate: ex.endDate || null,
      current: ex.current ?? false,
      responsibilities: ex.responsibilities || [],
      technologies: ex.technologies || []
    })) : [],
    projects: Array.isArray(p.projects) ? p.projects.map((pr: any) => ({
      id: pr.id,
      title: pr.title,
      description: pr.description,
      technologies: pr.technologies || [],
      features: pr.features || [],
      securityHighlights: pr.securityHighlights || [],
      url: pr.url || null,
      githubUrl: pr.githubUrl || null
    })) : [],
    skills: skillsObj,
    resumes: Array.isArray(p.resumes) ? p.resumes.map((r: any) => ({
      id: r.id,
      name: r.name,
      fileName: r.fileName,
      fileData: r.fileData || '',
      fileType: r.fileType || 'application/pdf',
      targetRoles: r.targetRoles || [],
      relevantSkills: r.relevantSkills || [],
      isDefault: r.isDefault ?? false,
      createdAt: r.createdAt ? new Date(r.createdAt).toISOString() : new Date().toISOString()
    })) : [],
    applicationQuestions: Array.isArray(p.applicationQuestions) ? p.applicationQuestions.map((q: any) => ({
      id: q.id,
      category: q.category,
      question: q.question,
      answer: q.answer,
      notes: q.notes || undefined
    })) : []
  };
}

export async function getUserProfile(userId: string): Promise<UserProfile | null> {
  const prisma = getPrismaClient();

  const profile = await prisma.profile.findUnique({
    where: { userId },
    include: {
      jobPreference: true,
      workAuthorization: true,
      studentEnrollment: true,
      countryAuthorizations: true,
      applicationQuestions: true,
      coverLetters: true,
      education: true,
      experience: true,
      projects: true,
      skills: true,
      resumes: true
    }
  });

  if (!profile) return null;
  return mapPrismaProfileToUserProfile(profile);
}

export type ProfileUpdatePayload = {
  personal?: Partial<UserProfile['personal']>;
  jobPreferences?: Partial<UserProfile['jobPreferences']>;
  workAuthorization?: Partial<UserProfile['workAuthorization']>;
  education?: UserProfile['education'];
  experience?: UserProfile['experience'];
  projects?: UserProfile['projects'];
  skills?: UserProfile['skills'] | Record<string, string[]>;
  resumes?: UserProfile['resumes'];
  applicationQuestions?: UserProfile['applicationQuestions'];
  school?: Partial<UserProfile['school']>;
};

export async function upsertUserProfile(userId: string, data: ProfileUpdatePayload | any): Promise<UserProfile> {
  const prisma = getPrismaClient();

  const existing = await prisma.profile.findUnique({
    where: { userId },
    include: {
      jobPreference: true,
      workAuthorization: true
    }
  });

  const pData: Partial<UserProfile['personal']> = data.personal || {};

  if (!existing) {
    const created = await prisma.profile.create({
      data: {
        userId,
        fullName: pData.fullName || '',
        firstName: pData.firstName || '',
        lastName: pData.lastName || '',
        preferredName: pData.preferredName || null,
        email: pData.email || '',
        phone: pData.phone || '',
        city: pData.city || '',
        state: pData.state || '',
        country: pData.country || '',
        pincode: pData.pincode || '',
        address: pData.address || null,
        postalCode: pData.postalCode || null,
        age: pData.age !== undefined ? pData.age : null,
        dateOfBirth: pData.dateOfBirth || null,
        gender: pData.gender || null,
        genderCustom: pData.genderCustom || null,
        linkedin: pData.linkedin || null,
        github: pData.github || null,
        portfolio: pData.portfolio || null,
        summary: pData.summary || null,
        targetIndustries: data.jobPreferences?.targetIndustries || [],
        targetJobTitles: data.jobPreferences?.targetJobTitles || [],
        targetCareerAreas: data.jobPreferences?.targetCareerAreas || [],
        employmentStatus: data.jobPreferences?.employmentStatus || null,
        isStudent: Boolean(data.jobPreferences?.studentEnrollment?.isCurrentlyEnrolled),
        jobPreference: {
          create: {
            targetRoles: data.jobPreferences?.targetRoles || [],
            employmentTypes: data.jobPreferences?.employmentTypes || ['Full-time'],
            preferredLocations: data.jobPreferences?.preferredLocations || [],
            willingToRelocate: data.jobPreferences?.willingToRelocate ?? true,
            willingToWorkRemotely: data.jobPreferences?.willingToWorkRemotely ?? true,
            noticePeriod: data.jobPreferences?.noticePeriod || '15 days'
          }
        },
        workAuthorization: {
          create: {
            indiaAuthorized: data.workAuthorization?.indiaAuthorized ?? true,
            indiaSponsorshipRequired: data.workAuthorization?.indiaSponsorshipRequired ?? false,
            usAuthorized: data.workAuthorization?.usAuthorized ?? false,
            usSponsorshipRequired: data.workAuthorization?.usSponsorshipRequired ?? true,
            europeAuthorized: data.workAuthorization?.europeAuthorized ?? false,
            europeSponsorshipRequired: data.workAuthorization?.europeSponsorshipRequired ?? true
          }
        }
      },
      include: {
        jobPreference: true,
        workAuthorization: true,
        studentEnrollment: true,
        countryAuthorizations: true,
        applicationQuestions: true,
        coverLetters: true,
        education: true,
        experience: true,
        projects: true,
        skills: true,
        resumes: true
      }
    });
    return mapPrismaProfileToUserProfile(created);
  }

  // Update existing profile
  const updated = await prisma.profile.update({
    where: { userId },
    data: {
      ...(pData.fullName !== undefined ? { fullName: pData.fullName } : {}),
      ...(pData.firstName !== undefined ? { firstName: pData.firstName } : {}),
      ...(pData.lastName !== undefined ? { lastName: pData.lastName } : {}),
      ...(pData.preferredName !== undefined ? { preferredName: pData.preferredName } : {}),
      ...(pData.email !== undefined ? { email: pData.email } : {}),
      ...(pData.phone !== undefined ? { phone: pData.phone } : {}),
      ...(pData.city !== undefined ? { city: pData.city } : {}),
      ...(pData.state !== undefined ? { state: pData.state } : {}),
      ...(pData.country !== undefined ? { country: pData.country } : {}),
      ...(pData.pincode !== undefined ? { pincode: pData.pincode } : {}),
      ...(pData.address !== undefined ? { address: pData.address } : {}),
      ...(pData.postalCode !== undefined ? { postalCode: pData.postalCode } : {}),
      ...(pData.age !== undefined ? { age: pData.age } : {}),
      ...(pData.dateOfBirth !== undefined ? { dateOfBirth: pData.dateOfBirth } : {}),
      ...(pData.gender !== undefined ? { gender: pData.gender } : {}),
      ...(pData.genderCustom !== undefined ? { genderCustom: pData.genderCustom } : {}),
      ...(pData.linkedin !== undefined ? { linkedin: pData.linkedin } : {}),
      ...(pData.github !== undefined ? { github: pData.github } : {}),
      ...(pData.portfolio !== undefined ? { portfolio: pData.portfolio } : {}),
      ...(pData.summary !== undefined ? { summary: pData.summary } : {}),
      ...(data.jobPreferences?.targetIndustries !== undefined ? { targetIndustries: data.jobPreferences.targetIndustries } : {}),
      ...(data.jobPreferences?.targetJobTitles !== undefined ? { targetJobTitles: data.jobPreferences.targetJobTitles } : {}),
      ...(data.jobPreferences?.targetCareerAreas !== undefined ? { targetCareerAreas: data.jobPreferences.targetCareerAreas } : {}),
      ...(data.jobPreferences?.employmentStatus !== undefined ? { employmentStatus: data.jobPreferences.employmentStatus } : {}),
      ...(data.jobPreferences?.studentEnrollment?.isCurrentlyEnrolled !== undefined
        ? { isStudent: data.jobPreferences.studentEnrollment.isCurrentlyEnrolled }
        : {}),
      ...(data.jobPreferences ? {
        jobPreference: {
          upsert: {
            create: {
              targetRoles: data.jobPreferences.targetRoles || [],
              employmentTypes: data.jobPreferences.employmentTypes || ['Full-time'],
              preferredLocations: data.jobPreferences.preferredLocations || [],
              willingToRelocate: data.jobPreferences.willingToRelocate ?? true,
              willingToWorkRemotely: data.jobPreferences.willingToWorkRemotely ?? true,
              noticePeriod: data.jobPreferences.noticePeriod || '15 days'
            },
            update: {
              ...(data.jobPreferences.targetRoles !== undefined ? { targetRoles: data.jobPreferences.targetRoles } : {}),
              ...(data.jobPreferences.employmentTypes !== undefined ? { employmentTypes: data.jobPreferences.employmentTypes } : {}),
              ...(data.jobPreferences.preferredLocations !== undefined ? { preferredLocations: data.jobPreferences.preferredLocations } : {}),
              ...(data.jobPreferences.willingToRelocate !== undefined ? { willingToRelocate: data.jobPreferences.willingToRelocate } : {}),
              ...(data.jobPreferences.willingToWorkRemotely !== undefined ? { willingToWorkRemotely: data.jobPreferences.willingToWorkRemotely } : {}),
              ...(data.jobPreferences.noticePeriod !== undefined ? { noticePeriod: data.jobPreferences.noticePeriod } : {})
            }
          }
        }
      } : {}),
      ...(data.workAuthorization ? {
        workAuthorization: {
          upsert: {
            create: {
              indiaAuthorized: data.workAuthorization.indiaAuthorized ?? true,
              indiaSponsorshipRequired: data.workAuthorization.indiaSponsorshipRequired ?? false,
              usAuthorized: data.workAuthorization.usAuthorized ?? false,
              usSponsorshipRequired: data.workAuthorization.usSponsorshipRequired ?? true,
              europeAuthorized: data.workAuthorization.europeAuthorized ?? false,
              europeSponsorshipRequired: data.workAuthorization.europeSponsorshipRequired ?? true
            },
            update: {
              ...(data.workAuthorization.indiaAuthorized !== undefined ? { indiaAuthorized: data.workAuthorization.indiaAuthorized } : {}),
              ...(data.workAuthorization.indiaSponsorshipRequired !== undefined ? { indiaSponsorshipRequired: data.workAuthorization.indiaSponsorshipRequired } : {}),
              ...(data.workAuthorization.usAuthorized !== undefined ? { usAuthorized: data.workAuthorization.usAuthorized } : {}),
              ...(data.workAuthorization.usSponsorshipRequired !== undefined ? { usSponsorshipRequired: data.workAuthorization.usSponsorshipRequired } : {}),
              ...(data.workAuthorization.europeAuthorized !== undefined ? { europeAuthorized: data.workAuthorization.europeAuthorized } : {}),
              ...(data.workAuthorization.europeSponsorshipRequired !== undefined ? { europeSponsorshipRequired: data.workAuthorization.europeSponsorshipRequired } : {})
            }
          }
        }
      } : {})
    },
    include: {
      jobPreference: true,
      workAuthorization: true,
      studentEnrollment: true,
      countryAuthorizations: true,
      applicationQuestions: true,
      coverLetters: true,
      education: true,
      experience: true,
      projects: true,
      skills: true,
      resumes: true
    }
  });

  const targetProfileId = updated.id;

  if (data.skills) {
    await prisma.skill.deleteMany({ where: { profileId: targetProfileId } });
    const skillsToCreate: Array<{ profileId: string; category: string; name: string }> = [];
    for (const [cat, names] of Object.entries(data.skills)) {
      if (Array.isArray(names)) {
        for (const name of names) {
          skillsToCreate.push({ profileId: targetProfileId, category: cat, name });
        }
      }
    }
    if (skillsToCreate.length > 0) {
      await prisma.skill.createMany({ data: skillsToCreate });
    }
  }

  if (data.education) {
    await prisma.education.deleteMany({ where: { profileId: targetProfileId } });
    if (data.education.length > 0) {
      await prisma.education.createMany({
        data: data.education.map((e: any) => ({
          id: e.id,
          profileId: targetProfileId,
          degree: e.degree,
          branch: e.branch,
          university: e.university,
          location: e.location,
          startDate: e.startDate,
          endDate: e.endDate || null,
          expectedGraduation: e.expectedGraduation || null,
          cgpa: e.cgpa ? String(e.cgpa) : null,
          percentage: e.percentage ? String(e.percentage) : null,
          stream: e.stream || null
        }))
      });
    }
  }

  if (data.experience) {
    await prisma.experience.deleteMany({ where: { profileId: targetProfileId } });
    if (data.experience.length > 0) {
      await prisma.experience.createMany({
        data: data.experience.map((ex: any) => ({
          id: ex.id,
          profileId: targetProfileId,
          company: ex.company,
          title: ex.title,
          employmentType: ex.employmentType,
          location: ex.location,
          workMode: ex.workMode,
          startDate: ex.startDate,
          endDate: ex.endDate || null,
          current: ex.current ?? false,
          responsibilities: ex.responsibilities || [],
          technologies: ex.technologies || []
        }))
      });
    }
  }

  if (data.projects) {
    await prisma.project.deleteMany({ where: { profileId: targetProfileId } });
    if (data.projects.length > 0) {
      await prisma.project.createMany({
        data: data.projects.map((pr: any) => ({
          id: pr.id,
          profileId: targetProfileId,
          title: pr.title,
          description: pr.description,
          technologies: pr.technologies || [],
          features: pr.features || [],
          securityHighlights: pr.securityHighlights || [],
          url: pr.url || null,
          githubUrl: pr.githubUrl || null
        }))
      });
    }
  }

  const finalProfile = await getUserProfile(userId);
  return finalProfile || mapPrismaProfileToUserProfile(updated);
}

export async function getProfileForUser(userId: string): Promise<UserProfile> {
  const profile = await getUserProfile(userId);
  if (!profile) {
    return await upsertUserProfile(userId, {});
  }
  return profile;
}

export async function saveProfileForUser(userId: string, newProfile: Partial<UserProfile>): Promise<UserProfile> {
  return await upsertUserProfile(userId, newProfile);
}
