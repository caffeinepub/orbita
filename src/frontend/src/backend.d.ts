import type { Principal } from "@icp-sdk/core/principal";
export interface Some<T> {
    __kind__: "Some";
    value: T;
}
export interface None {
    __kind__: "None";
}
export type Option<T> = Some<T> | None;
export interface ContactInput {
    linkedIn: string;
    name: string;
    role: string;
    tags: Array<string>;
    email: string;
    company: string;
    notes: string;
    phone: string;
    companyId: string;
}
export interface Contact {
    id: Id;
    linkedIn: string;
    name: string;
    createdAt: bigint;
    role: string;
    tags: Array<string>;
    email: string;
    tenantId: Id;
    updatedAt: bigint;
    company: string;
    notes: string;
    phone: string;
    companyId: string;
}
export interface Task {
    id: Id;
    title: string;
    contactName: string;
    createdAt: bigint;
    completed: boolean;
    dueDate?: bigint;
    description: string;
    dealId: Id;
    tenantId: Id;
    contactId: Id;
    dealName: string;
}
export interface Company {
    id: Id;
    name: string;
    createdAt: bigint;
    tags: Array<string>;
    website: string;
    tenantId: Id;
    address: string;
    notes: string;
    phone: string;
    industry: string;
}
export interface TaskInput {
    title: string;
    contactName: string;
    completed: boolean;
    dueDate?: bigint;
    description: string;
    dealId: Id;
    contactId: Id;
    dealName: string;
}
export interface Activity {
    id: Id;
    title: string;
    activityType: ActivityType;
    contactName: string;
    createdAt: bigint;
    description: string;
    dealId: Id;
    tenantId: Id;
    occurredAt: bigint;
    companyName: string;
    contactId: Id;
    dealName: string;
    companyId: Id;
}
export interface DealNextActivityInput {
    activityType?: ActivityType;
    date?: bigint;
    note: string;
}
export interface ActivityInput {
    title: string;
    activityType: ActivityType;
    contactName: string;
    description: string;
    dealId: Id;
    occurredAt: bigint;
    companyName: string;
    contactId: Id;
    dealName: string;
    companyId: Id;
}
export interface DealInput {
    nextActivityDate?: bigint;
    title: string;
    nextActivityNote: string;
    nextActivityType?: ActivityType;
    contactName: string;
    value: number;
    tags: Array<string>;
    stage: Stage;
    notes: string;
    companyName: string;
    contactId: Id;
    companyId: Id;
}
export type Id = string;
export interface Deal {
    id: Id;
    nextActivityDate?: bigint;
    title: string;
    nextActivityNote: string;
    nextActivityType?: ActivityType;
    contactName: string;
    value: number;
    createdAt: bigint;
    tags: Array<string>;
    tenantId: Id;
    updatedAt: bigint;
    stage: Stage;
    notes: string;
    companyName: string;
    contactId: Id;
    companyId: Id;
}
export interface CompanyInput {
    name: string;
    tags: Array<string>;
    website: string;
    address: string;
    notes: string;
    phone: string;
    industry: string;
}
export interface UserProfile {
    name: string;
}
export enum ActivityType {
    Email = "Email",
    Call = "Call",
    Note = "Note",
    Meeting = "Meeting"
}
export enum Stage {
    Lead = "Lead",
    Qualified = "Qualified",
    Proposal = "Proposal",
    ClosedWon = "ClosedWon",
    Negotiation = "Negotiation",
    ClosedLost = "ClosedLost"
}
export enum UserRole {
    admin = "admin",
    user = "user",
    guest = "guest"
}
export interface backendInterface {
    assignCallerUserRole(user: Principal, role: UserRole): Promise<void>;
    createActivity(input: ActivityInput): Promise<string>;
    createCompany(input: CompanyInput): Promise<string>;
    createContact(input: ContactInput): Promise<string>;
    createDeal(input: DealInput): Promise<string>;
    createTask(input: TaskInput): Promise<string>;
    deleteActivity(id: string): Promise<void>;
    deleteCompany(id: string): Promise<void>;
    deleteContact(id: string): Promise<void>;
    deleteDeal(id: string): Promise<void>;
    deleteTask(id: string): Promise<void>;
    getActivity(id: string): Promise<Activity>;
    getCallerUserProfile(): Promise<UserProfile | null>;
    getCallerUserRole(): Promise<UserRole>;
    getCompany(id: string): Promise<Company>;
    getContact(id: string): Promise<Contact>;
    getDeal(id: string): Promise<Deal>;
    getTask(id: string): Promise<Task>;
    getUserProfile(user: Principal): Promise<UserProfile | null>;
    isCallerAdmin(): Promise<boolean>;
    listActivities(): Promise<Array<Activity>>;
    listActivitiesByCompany(companyId: string): Promise<Array<Activity>>;
    listActivitiesByContact(contactId: string): Promise<Array<Activity>>;
    listActivitiesByDeal(dealId: string): Promise<Array<Activity>>;
    listCompanies(): Promise<Array<Company>>;
    listContacts(): Promise<Array<Contact>>;
    listDeals(): Promise<Array<Deal>>;
    listDealsByStage(stage: Stage): Promise<Array<Deal>>;
    listTasks(): Promise<Array<Task>>;
    listTasksByCompleted(completed: boolean): Promise<Array<Task>>;
    saveCallerUserProfile(profile: UserProfile): Promise<void>;
    searchCompanies(searchText: string): Promise<Array<Company>>;
    searchContacts(searchText: string): Promise<Array<Contact>>;
    searchDeals(searchText: string): Promise<Array<Deal>>;
    setDealNextActivity(id: string, input: DealNextActivityInput): Promise<void>;
    updateActivity(id: string, input: ActivityInput): Promise<void>;
    updateCompany(id: string, input: CompanyInput): Promise<void>;
    updateContact(id: string, input: ContactInput): Promise<void>;
    updateDeal(id: string, input: DealInput): Promise<void>;
    updateTask(id: string, input: TaskInput): Promise<void>;
    getDashboardSummary(todayStart: bigint, todayEnd: bigint): Promise<DashboardSummary>;
    vetkdPublicKey(): Promise<Uint8Array>;
    vetkdDeriveKey(transportPublicKey: Uint8Array): Promise<Uint8Array>;
}
export interface StageBreakdownEntry {
    stage: Stage;
    count: number;
    value: number;
}
export interface DashboardSummary {
    pipeline: number;
    openDeals: number;
    winRate: number;
    tasksDueToday: number;
    overdueTasks: number;
    totalContacts: number;
    overdueFollowUps: number;
    todayFollowUps: number;
    stageBreakdown: Array<StageBreakdownEntry>;
    recentActivities: Array<Activity>;
    followUpDeals: Array<Deal>;
}
