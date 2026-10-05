/**
 * packages/jobs
 * Reserved for future job-provider integrations and job discovery functionality.
 */

export interface JobListing {
  id: string;
  title: string;
  company: string;
  location: string;
  url: string;
  description?: string;
  postedAt?: string;
  source?: string;
  salaryRange?: {
    min?: number;
    max?: number;
    currency?: string;
  };
}

export interface JobSearchQuery {
  keywords?: string[];
  locations?: string[];
  roles?: string[];
  remoteOnly?: boolean;
}

export interface JobProvider {
  name: string;
  search(query: JobSearchQuery): Promise<JobListing[]>;
}
