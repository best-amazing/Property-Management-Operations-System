import { useQuery, useQueryClient } from "@tanstack/react-query";
import { pmosApi } from "../services/pmosApi";
import { ContactFilters } from "../types/pmos";

export const QUERY_KEYS = {
  pipelines: ["pipelines"] as const,
  tickets: (pipelineId: string, mine: boolean) => ["tickets", pipelineId, mine] as const,
  users: ["users"] as const,
  activity: ["activity"] as const,
  me: ["me"] as const,
  staffTypes: ["staffTypes"] as const,
  teams: ["teams"] as const,
  departments: ["departments"] as const,
  contacts: ["contacts"] as const,
  contactFilterOptions: ["contactFilterOptions"] as const,
  properties: ["properties"] as const,
  contactTypes: ["contactTypes"] as const,
  adminPolicies: ["adminPolicies"] as const,
  policyCategories: ["policyCategories"] as const,
  adminAnnouncements: ["adminAnnouncements"] as const,
  myAnnouncements: ["myAnnouncements"] as const,
};

export function usePipelines() {
  return useQuery({
    queryKey: QUERY_KEYS.pipelines,
    queryFn: pmosApi.getPipelines,
    staleTime: 5 * 60 * 1000,
  });
}

export function useTickets(pipelineId: string | null, mine: boolean) {
  return useQuery({
    queryKey: QUERY_KEYS.tickets(pipelineId ?? "", mine),
    queryFn: () => pmosApi.getTickets(pipelineId!, mine),
    enabled: !!pipelineId,
    staleTime: 30 * 1000,
  });
}

export function useUsers() {
  return useQuery({
    queryKey: QUERY_KEYS.users,
    queryFn: pmosApi.getUsers,
  });
}

export function useMe() {
  return useQuery({
    queryKey: QUERY_KEYS.me,
    queryFn: pmosApi.getMe,
    staleTime: 5 * 60 * 1000,
  });
}

export function useStaffTypes() {
  return useQuery({
    queryKey: QUERY_KEYS.staffTypes,
    queryFn: pmosApi.getStaffTypes,
    staleTime: 5 * 60 * 1000,
  });
}

export function useTeams() {
  return useQuery({
    queryKey: QUERY_KEYS.teams,
    queryFn: pmosApi.getTeams,
    staleTime: 5 * 60 * 1000,
  });
}

export function useDepartments() {
  return useQuery({
    queryKey: QUERY_KEYS.departments,
    queryFn: pmosApi.getDepartments,
    staleTime: 5 * 60 * 1000,
  });
}

export function useInvalidateTickets() {
  const qc = useQueryClient();
  return (pipelineId: string) => qc.invalidateQueries({ queryKey: ["tickets", pipelineId] });
}

export function useRefreshTickets(pipelineId: string | null) {
  const qc = useQueryClient();
  return () => {
    if (pipelineId) qc.invalidateQueries({ queryKey: ["tickets", pipelineId] });
  };
}

export function useContacts(filters: ContactFilters = {}) {
  return useQuery({
    queryKey: [...QUERY_KEYS.contacts, filters],
    queryFn: () => pmosApi.getAdminContacts(filters),
    placeholderData: prev => prev,
  });
}

export function useAdminContactFilterOptions() {
  return useQuery({ queryKey: QUERY_KEYS.contactFilterOptions, queryFn: pmosApi.getAdminContactFilterOptions });
}

export function useProperties() {
  return useQuery({ queryKey: QUERY_KEYS.properties, queryFn: pmosApi.getProperties });
}

export function useContactTypes() {
  return useQuery({ queryKey: QUERY_KEYS.contactTypes, queryFn: pmosApi.getContactTypes });
}

export function useAdminPolicies() {
  return useQuery({ queryKey: QUERY_KEYS.adminPolicies, queryFn: pmosApi.getPolicies });
}

export function usePolicyCategories() {
  return useQuery({ queryKey: QUERY_KEYS.policyCategories, queryFn: pmosApi.getPolicyCategories });
}

export function useAdminAnnouncements() {
  return useQuery({ queryKey: QUERY_KEYS.adminAnnouncements, queryFn: pmosApi.getAdminAnnouncements });
}

export function useMyAnnouncements() {
  return useQuery({
    queryKey: QUERY_KEYS.myAnnouncements,
    queryFn: pmosApi.getMyAnnouncements,
    refetchInterval: 60 * 1000, // Refresh every minute
  });
}
