import Map "mo:core/Map";
import Text "mo:core/Text";
import Nat "mo:core/Nat";
import Principal "mo:core/Principal";
import Runtime "mo:core/Runtime";
import Random "mo:core/Random";
import Int "mo:core/Int";
import Nat8 "mo:core/Nat8";
import Time "mo:core/Time";

import MixinAuthorization "authorization/MixinAuthorization";
import AccessControl "authorization/access-control";


actor {
  let accessControlState = AccessControl.initState();
  include MixinAuthorization(accessControlState);

  public type Id = Text;

  public type ActivityType = {
    #Call;
    #Meeting;
    #Note;
    #Email;
  };

  // ── Legacy types (kept for upgrade compatibility) ──────────────────────

  type StageV1 = {
    #Lead;
    #Qualified;
    #Proposal;
    #ClosedWon;
    #ClosedLost;
  };

  type DealV1 = {
    id : Id;
    tenantId : Id;
    title : Text;
    companyId : Id;
    companyName : Text;
    contactId : Id;
    contactName : Text;
    stage : StageV1;
    value : Float;
    notes : Text;
    tags : [Text];
    nextActivityDate : ?Int;
    nextActivityType : ?ActivityType;
    nextActivityNote : Text;
    createdAt : Int;
    updatedAt : Int;
  };

  type ActivityV1 = {
    id : Id;
    tenantId : Id;
    contactId : Id;
    contactName : Text;
    dealId : Id;
    dealName : Text;
    activityType : ActivityType;
    title : Text;
    description : Text;
    occurredAt : Int;
    createdAt : Int;
  };

  // ── Current public types ───────────────────────────────────────────────

  public type Stage = {
    #Lead;
    #Qualified;
    #Proposal;
    #Negotiation;
    #ClosedWon;
    #ClosedLost;
  };

  public type Company = {
    id : Id;
    tenantId : Id;
    name : Text;
    industry : Text;
    website : Text;
    phone : Text;
    address : Text;
    notes : Text;
    tags : [Text];
    createdAt : Int;
  };

  public type CompanyInput = {
    name : Text;
    industry : Text;
    website : Text;
    phone : Text;
    address : Text;
    notes : Text;
    tags : [Text];
  };

  public type Deal = {
    id : Id;
    tenantId : Id;
    title : Text;
    companyId : Id;
    companyName : Text;
    contactId : Id;
    contactName : Text;
    stage : Stage;
    value : Float;
    notes : Text;
    tags : [Text];
    nextActivityDate : ?Int;
    nextActivityType : ?ActivityType;
    nextActivityNote : Text;
    createdAt : Int;
    updatedAt : Int;
  };

  public type DealInput = {
    title : Text;
    companyId : Id;
    companyName : Text;
    contactId : Id;
    contactName : Text;
    stage : Stage;
    value : Float;
    notes : Text;
    tags : [Text];
    nextActivityDate : ?Int;
    nextActivityType : ?ActivityType;
    nextActivityNote : Text;
  };

  public type DealNextActivityInput = {
    date : ?Int;
    activityType : ?ActivityType;
    note : Text;
  };

  public type Task = {
    id : Id;
    tenantId : Id;
    title : Text;
    description : Text;
    contactId : Id;
    contactName : Text;
    dealId : Id;
    dealName : Text;
    dueDate : ?Int;
    completed : Bool;
    createdAt : Int;
  };

  public type TaskInput = {
    title : Text;
    description : Text;
    contactId : Id;
    contactName : Text;
    dealId : Id;
    dealName : Text;
    dueDate : ?Int;
    completed : Bool;
  };

  public type Activity = {
    id : Id;
    tenantId : Id;
    contactId : Id;
    contactName : Text;
    dealId : Id;
    dealName : Text;
    companyId : Id;
    companyName : Text;
    activityType : ActivityType;
    title : Text;
    description : Text;
    occurredAt : Int;
    createdAt : Int;
  };

  public type ActivityInput = {
    contactId : Id;
    contactName : Text;
    dealId : Id;
    dealName : Text;
    companyId : Id;
    companyName : Text;
    activityType : ActivityType;
    title : Text;
    description : Text;
    occurredAt : Int;
  };

  public type Contact = {
    id : Id;
    tenantId : Id;
    name : Text;
    company : Text;
    companyId : Text;
    role : Text;
    email : Text;
    phone : Text;
    linkedIn : Text;
    notes : Text;
    tags : [Text];
    createdAt : Int;
    updatedAt : Int;
  };

  public type ContactInput = {
    name : Text;
    company : Text;
    companyId : Text;
    role : Text;
    email : Text;
    phone : Text;
    linkedIn : Text;
    notes : Text;
    tags : [Text];
  };

  public type UserProfile = {
    name : Text;
  };

  // ── Security: rate limiting ────────────────────────────────────────────
  // Tracks (windowStart: Int, callCount: Nat) per principal.
  // Window is 60 seconds; max 100 calls per window.
  let RATE_WINDOW_NS : Int = 60_000_000_000; // 60 seconds in nanoseconds
  let RATE_LIMIT_MAX : Nat = 100;

  stable var rateLimitMap = Map.empty<Principal, (Int, Nat)>();

  func rateLimit(caller : Principal) {
    let now = Time.now();
    switch (rateLimitMap.get(caller)) {
      case (null) {
        rateLimitMap.add(caller, (now, 1));
      };
      case (?(windowStart, count)) {
        if (now - windowStart > RATE_WINDOW_NS) {
          // New window
          rateLimitMap.add(caller, (now, 1));
        } else if (count >= RATE_LIMIT_MAX) {
          Runtime.trap("Rate limit exceeded. Please slow down.");
        } else {
          rateLimitMap.add(caller, (windowStart, count + 1));
        };
      };
    };
  };

  // ── Legacy stable vars (backward compat with deployed canister) ────────
  stable var activitiesStore = Map.empty<Id, ActivityV1>();
  stable var dealsStore = Map.empty<Id, DealV1>();

  // ── Stable persistence arrays (primary storage) ────────────────────────
  stable var stableContacts : [(Id, Contact)] = [];
  stable var stableCompanies : [(Id, Company)] = [];
  stable var stableDeals : [(Id, Deal)] = [];
  stable var stableTasks : [(Id, Task)] = [];
  stable var stableActivities : [(Id, Activity)] = [];
  stable var stableProfiles : [(Principal, UserProfile)] = [];

  // ── Working in-memory Maps (rebuilt on every upgrade) ─────────────────
  stable var contactsStore = Map.empty<Id, Contact>();
  stable var companiesStore = Map.empty<Id, Company>();
  stable var dealsMap = Map.empty<Id, Deal>();
  stable var tasksStore = Map.empty<Id, Task>();
  stable var activitiesStoreV2 = Map.empty<Id, Activity>();
  stable var userProfiles = Map.empty<Principal, UserProfile>();

  system func preupgrade() {
    activitiesStore := Map.empty<Id, ActivityV1>();
    dealsStore      := Map.empty<Id, DealV1>();
  };

  system func postupgrade() {
    for ((k, v) in activitiesStore.entries()) {
      activitiesStoreV2.add(k, {
        id          = v.id;
        tenantId    = v.tenantId;
        contactId   = v.contactId;
        contactName = v.contactName;
        dealId      = v.dealId;
        dealName    = v.dealName;
        companyId   = "";
        companyName = "";
        activityType = v.activityType;
        title       = v.title;
        description = v.description;
        occurredAt  = v.occurredAt;
        createdAt   = v.createdAt;
      });
    };

    for ((k, v) in dealsStore.entries()) {
      let newStage : Stage = switch (v.stage) {
        case (#Lead)      #Lead;
        case (#Qualified) #Qualified;
        case (#Proposal)  #Proposal;
        case (#ClosedWon) #ClosedWon;
        case (#ClosedLost) #ClosedLost;
      };
      dealsMap.add(k, {
        id               = v.id;
        tenantId         = v.tenantId;
        title            = v.title;
        companyId        = v.companyId;
        companyName      = v.companyName;
        contactId        = v.contactId;
        contactName      = v.contactName;
        stage            = newStage;
        value            = v.value;
        notes            = v.notes;
        tags             = v.tags;
        nextActivityDate = v.nextActivityDate;
        nextActivityType = v.nextActivityType;
        nextActivityNote = v.nextActivityNote;
        createdAt        = v.createdAt;
        updatedAt        = v.updatedAt;
      });
    };

    for ((k, v) in stableContacts.vals())   { if (contactsStore.get(k) == null)  { contactsStore.add(k, v) } };
    for ((k, v) in stableCompanies.vals())  { if (companiesStore.get(k) == null) { companiesStore.add(k, v) } };
    for ((k, v) in stableDeals.vals())      { if (dealsMap.get(k) == null)       { dealsMap.add(k, v) } };
    for ((k, v) in stableTasks.vals())      { if (tasksStore.get(k) == null)     { tasksStore.add(k, v) } };
    for ((k, v) in stableActivities.vals()) { if (activitiesStoreV2.get(k) == null) { activitiesStoreV2.add(k, v) } };
    for ((k, v) in stableProfiles.vals())   { if (userProfiles.get(k) == null)   { userProfiles.add(k, v) } };
    stableContacts  := [];
    stableCompanies := [];
    stableDeals     := [];
    stableTasks     := [];
    stableActivities := [];
    stableProfiles  := [];
  };

  // ── Helpers ────────────────────────────────────────────────────────────

  func generateUUID() : async Text {
    let entropy = await Random.blob();
    let bytes = entropy.toArray();
    var uuid = "";
    var i = 0;
    for (byte in bytes.vals()) {
      if (i == 4 or i == 6 or i == 8 or i == 10) { uuid #= "-" };
      uuid #= byte.toText();
      i += 1;
      if (i >= 16) { return uuid };
    };
    uuid;
  };

  func validateTenant(caller : Principal, tenantId : Text) {
    if (getTenantId(caller) != tenantId) {
      Runtime.trap("Unauthorized: You do not have access to this entity.");
    };
  };

  func getTenantId(caller : Principal) : Text {
    if (caller.toText() == "2vxsx-fae") {
      Runtime.trap("Not authenticated, cannot determine tenant id.");
    };
    caller.toText();
  };

  func requireUser(caller : Principal) {
    if (not AccessControl.hasPermission(accessControlState, caller, #user)) {
      Runtime.trap("Unauthorized");
    };
  };

  // ── User Profile ───────────────────────────────────────────────────────

  public query ({ caller }) func getCallerUserProfile() : async ?UserProfile {
    requireUser(caller);
    userProfiles.get(caller);
  };

  public query ({ caller }) func getUserProfile(user : Principal) : async ?UserProfile {
    if (caller != user and not AccessControl.isAdmin(accessControlState, caller)) {
      Runtime.trap("Unauthorized");
    };
    userProfiles.get(user);
  };

  public shared ({ caller }) func saveCallerUserProfile(profile : UserProfile) : async () {
    requireUser(caller);
    rateLimit(caller);
    userProfiles.add(caller, profile);
  };

  // ── Contacts ───────────────────────────────────────────────────────────

  public shared ({ caller }) func createContact(input : ContactInput) : async Text {
    requireUser(caller);
    rateLimit(caller);
    let id = await generateUUID();
    let ts = Time.now();
    contactsStore.add(id, {
      id;
      tenantId  = getTenantId(caller);
      name      = input.name;
      company   = input.company;
      companyId = input.companyId;
      role      = input.role;
      email     = input.email;
      phone     = input.phone;
      linkedIn  = input.linkedIn;
      notes     = input.notes;
      tags      = input.tags;
      createdAt = ts;
      updatedAt = ts;
    });
    id;
  };

  public shared ({ caller }) func updateContact(id : Text, input : ContactInput) : async () {
    requireUser(caller);
    rateLimit(caller);
    switch (contactsStore.get(id)) {
      case (null) { Runtime.trap("Contact not found.") };
      case (?old) {
        validateTenant(caller, old.tenantId);
        contactsStore.add(id, {
          old with
          name      = input.name;
          company   = input.company;
          companyId = input.companyId;
          role      = input.role;
          email     = input.email;
          phone     = input.phone;
          linkedIn  = input.linkedIn;
          notes     = input.notes;
          tags      = input.tags;
          updatedAt = Time.now();
        });
      };
    };
  };

  public shared ({ caller }) func deleteContact(id : Text) : async () {
    requireUser(caller);
    rateLimit(caller);
    switch (contactsStore.get(id)) {
      case (null) { Runtime.trap("Contact not found.") };
      case (?c)   { validateTenant(caller, c.tenantId); contactsStore.remove(id) };
    };
  };

  public query ({ caller }) func listContacts() : async [Contact] {
    requireUser(caller);
    let tid = getTenantId(caller);
    contactsStore.values().toArray().filter(func(c) { c.tenantId == tid });
  };

  public query ({ caller }) func getContact(id : Text) : async Contact {
    requireUser(caller);
    switch (contactsStore.get(id)) {
      case (null) { Runtime.trap("Contact not found.") };
      case (?c)   { validateTenant(caller, c.tenantId); c };
    };
  };

  public query ({ caller }) func searchContacts(q : Text) : async [Contact] {
    requireUser(caller);
    let tid = getTenantId(caller);
    contactsStore.values().toArray().filter(func(c) {
      c.tenantId == tid and (
        c.name.contains(#text q) or c.email.contains(#text q) or
        c.phone.contains(#text q) or c.company.contains(#text q)
      )
    });
  };

  // ── Companies ──────────────────────────────────────────────────────────

  public shared ({ caller }) func createCompany(input : CompanyInput) : async Text {
    requireUser(caller);
    rateLimit(caller);
    let id = await generateUUID();
    companiesStore.add(id, {
      id;
      tenantId  = getTenantId(caller);
      name      = input.name;
      industry  = input.industry;
      website   = input.website;
      phone     = input.phone;
      address   = input.address;
      notes     = input.notes;
      tags      = input.tags;
      createdAt = Time.now();
    });
    id;
  };

  public shared ({ caller }) func updateCompany(id : Text, input : CompanyInput) : async () {
    requireUser(caller);
    rateLimit(caller);
    switch (companiesStore.get(id)) {
      case (null) { Runtime.trap("Company not found.") };
      case (?old) {
        validateTenant(caller, old.tenantId);
        companiesStore.add(id, {
          old with
          name     = input.name;
          industry = input.industry;
          website  = input.website;
          phone    = input.phone;
          address  = input.address;
          notes    = input.notes;
          tags     = input.tags;
        });
      };
    };
  };

  public shared ({ caller }) func deleteCompany(id : Text) : async () {
    requireUser(caller);
    rateLimit(caller);
    switch (companiesStore.get(id)) {
      case (null) { Runtime.trap("Company not found.") };
      case (?c)   { validateTenant(caller, c.tenantId); companiesStore.remove(id) };
    };
  };

  public query ({ caller }) func listCompanies() : async [Company] {
    requireUser(caller);
    let tid = getTenantId(caller);
    companiesStore.values().toArray().filter(func(c) { c.tenantId == tid });
  };

  public query ({ caller }) func getCompany(id : Text) : async Company {
    requireUser(caller);
    switch (companiesStore.get(id)) {
      case (null) { Runtime.trap("Company not found.") };
      case (?c)   { validateTenant(caller, c.tenantId); c };
    };
  };

  public query ({ caller }) func searchCompanies(q : Text) : async [Company] {
    requireUser(caller);
    let tid = getTenantId(caller);
    companiesStore.values().toArray().filter(func(c) {
      c.tenantId == tid and (
        c.name.contains(#text q) or c.industry.contains(#text q) or
        c.website.contains(#text q)
      )
    });
  };

  // ── Deals ──────────────────────────────────────────────────────────────

  public shared ({ caller }) func createDeal(input : DealInput) : async Text {
    requireUser(caller);
    rateLimit(caller);
    let id = await generateUUID();
    let ts = Time.now();
    dealsMap.add(id, {
      id;
      tenantId         = getTenantId(caller);
      title            = input.title;
      companyId        = input.companyId;
      companyName      = input.companyName;
      contactId        = input.contactId;
      contactName      = input.contactName;
      stage            = input.stage;
      value            = input.value;
      notes            = input.notes;
      tags             = input.tags;
      nextActivityDate = input.nextActivityDate;
      nextActivityType = input.nextActivityType;
      nextActivityNote = input.nextActivityNote;
      createdAt        = ts;
      updatedAt        = ts;
    });
    id;
  };

  public shared ({ caller }) func updateDeal(id : Text, input : DealInput) : async () {
    requireUser(caller);
    rateLimit(caller);
    switch (dealsMap.get(id)) {
      case (null) { Runtime.trap("Deal not found.") };
      case (?old) {
        validateTenant(caller, old.tenantId);
        dealsMap.add(id, {
          old with
          title            = input.title;
          companyId        = input.companyId;
          companyName      = input.companyName;
          contactId        = input.contactId;
          contactName      = input.contactName;
          stage            = input.stage;
          value            = input.value;
          notes            = input.notes;
          tags             = input.tags;
          nextActivityDate = input.nextActivityDate;
          nextActivityType = input.nextActivityType;
          nextActivityNote = input.nextActivityNote;
          updatedAt        = Time.now();
        });
      };
    };
  };

  public shared ({ caller }) func deleteDeal(id : Text) : async () {
    requireUser(caller);
    rateLimit(caller);
    switch (dealsMap.get(id)) {
      case (null) { Runtime.trap("Deal not found.") };
      case (?d)   { validateTenant(caller, d.tenantId); dealsMap.remove(id) };
    };
  };

  public query ({ caller }) func listDeals() : async [Deal] {
    requireUser(caller);
    let tid = getTenantId(caller);
    dealsMap.values().toArray().filter(func(d) { d.tenantId == tid });
  };

  public query ({ caller }) func getDeal(id : Text) : async Deal {
    requireUser(caller);
    switch (dealsMap.get(id)) {
      case (null) { Runtime.trap("Deal not found.") };
      case (?d)   { validateTenant(caller, d.tenantId); d };
    };
  };

  public query ({ caller }) func listDealsByStage(stage : Stage) : async [Deal] {
    requireUser(caller);
    let tid = getTenantId(caller);
    dealsMap.values().toArray().filter(func(d) { d.tenantId == tid and d.stage == stage });
  };

  public query ({ caller }) func searchDeals(q : Text) : async [Deal] {
    requireUser(caller);
    let tid = getTenantId(caller);
    dealsMap.values().toArray().filter(func(d) {
      d.tenantId == tid and (
        d.title.contains(#text q) or d.companyName.contains(#text q) or
        d.contactName.contains(#text q)
      )
    });
  };

  public shared ({ caller }) func setDealNextActivity(id : Text, input : DealNextActivityInput) : async () {
    requireUser(caller);
    rateLimit(caller);
    switch (dealsMap.get(id)) {
      case (null) { Runtime.trap("Deal not found.") };
      case (?d) {
        validateTenant(caller, d.tenantId);
        dealsMap.add(id, {
          d with
          nextActivityDate = input.date;
          nextActivityType = input.activityType;
          nextActivityNote = input.note;
        });
      };
    };
  };

  // ── Tasks ──────────────────────────────────────────────────────────────

  public shared ({ caller }) func createTask(input : TaskInput) : async Text {
    requireUser(caller);
    rateLimit(caller);
    let id = await generateUUID();
    tasksStore.add(id, {
      id;
      tenantId    = getTenantId(caller);
      title       = input.title;
      description = input.description;
      contactId   = input.contactId;
      contactName = input.contactName;
      dealId      = input.dealId;
      dealName    = input.dealName;
      dueDate     = input.dueDate;
      completed   = input.completed;
      createdAt   = Time.now();
    });
    id;
  };

  public shared ({ caller }) func updateTask(id : Text, input : TaskInput) : async () {
    requireUser(caller);
    rateLimit(caller);
    switch (tasksStore.get(id)) {
      case (null) { Runtime.trap("Task not found.") };
      case (?old) {
        validateTenant(caller, old.tenantId);
        tasksStore.add(id, {
          old with
          title       = input.title;
          description = input.description;
          contactId   = input.contactId;
          contactName = input.contactName;
          dealId      = input.dealId;
          dealName    = input.dealName;
          dueDate     = input.dueDate;
          completed   = input.completed;
        });
      };
    };
  };

  public shared ({ caller }) func deleteTask(id : Text) : async () {
    requireUser(caller);
    rateLimit(caller);
    switch (tasksStore.get(id)) {
      case (null) { Runtime.trap("Task not found.") };
      case (?t)   { validateTenant(caller, t.tenantId); tasksStore.remove(id) };
    };
  };

  public query ({ caller }) func listTasks() : async [Task] {
    requireUser(caller);
    let tid = getTenantId(caller);
    tasksStore.values().toArray().filter(func(t) { t.tenantId == tid });
  };

  public query ({ caller }) func getTask(id : Text) : async Task {
    requireUser(caller);
    switch (tasksStore.get(id)) {
      case (null) { Runtime.trap("Task not found.") };
      case (?t)   { validateTenant(caller, t.tenantId); t };
    };
  };

  public query ({ caller }) func listTasksByCompleted(completed : Bool) : async [Task] {
    requireUser(caller);
    let tid = getTenantId(caller);
    tasksStore.values().toArray().filter(func(t) { t.tenantId == tid and t.completed == completed });
  };

  // ── Activities ─────────────────────────────────────────────────────────

  public shared ({ caller }) func createActivity(input : ActivityInput) : async Text {
    requireUser(caller);
    rateLimit(caller);
    let id = await generateUUID();
    activitiesStoreV2.add(id, {
      id;
      tenantId    = getTenantId(caller);
      contactId   = input.contactId;
      contactName = input.contactName;
      dealId      = input.dealId;
      dealName    = input.dealName;
      companyId   = input.companyId;
      companyName = input.companyName;
      activityType = input.activityType;
      title       = input.title;
      description = input.description;
      occurredAt  = input.occurredAt;
      createdAt   = Time.now();
    });
    id;
  };

  public shared ({ caller }) func updateActivity(id : Text, input : ActivityInput) : async () {
    requireUser(caller);
    rateLimit(caller);
    switch (activitiesStoreV2.get(id)) {
      case (null) { Runtime.trap("Activity not found.") };
      case (?old) {
        validateTenant(caller, old.tenantId);
        activitiesStoreV2.add(id, {
          old with
          contactId   = input.contactId;
          contactName = input.contactName;
          dealId      = input.dealId;
          dealName    = input.dealName;
          companyId   = input.companyId;
          companyName = input.companyName;
          activityType = input.activityType;
          title       = input.title;
          description = input.description;
          occurredAt  = input.occurredAt;
        });
      };
    };
  };

  public shared ({ caller }) func deleteActivity(id : Text) : async () {
    requireUser(caller);
    rateLimit(caller);
    switch (activitiesStoreV2.get(id)) {
      case (null) { Runtime.trap("Activity not found.") };
      case (?a)   { validateTenant(caller, a.tenantId); activitiesStoreV2.remove(id) };
    };
  };

  public query ({ caller }) func listActivities() : async [Activity] {
    requireUser(caller);
    let tid = getTenantId(caller);
    activitiesStoreV2.values().toArray().filter(func(a) { a.tenantId == tid });
  };

  public query ({ caller }) func getActivity(id : Text) : async Activity {
    requireUser(caller);
    switch (activitiesStoreV2.get(id)) {
      case (null) { Runtime.trap("Activity not found.") };
      case (?a)   { validateTenant(caller, a.tenantId); a };
    };
  };

  public query ({ caller }) func listActivitiesByContact(contactId : Text) : async [Activity] {
    requireUser(caller);
    let tid = getTenantId(caller);
    activitiesStoreV2.values().toArray().filter(func(a) {
      a.tenantId == tid and a.contactId == contactId
    });
  };

  public query ({ caller }) func listActivitiesByDeal(dealId : Text) : async [Activity] {
    requireUser(caller);
    let tid = getTenantId(caller);
    activitiesStoreV2.values().toArray().filter(func(a) {
      a.tenantId == tid and a.dealId == dealId
    });
  };

  public query ({ caller }) func listActivitiesByCompany(companyId : Text) : async [Activity] {
    requireUser(caller);
    let tid = getTenantId(caller);
    activitiesStoreV2.values().toArray().filter(func(a) {
      a.tenantId == tid and a.companyId == companyId
    });
  };

  // ── vetKD Encryption Endpoints ─────────────────────────────────────────

  type VetKdCurve = { #bls12_381_g2 };
  type VetKdKeyId = { curve : VetKdCurve; name : Text };
  type VetKdPublicKeyRequest = {
    canister_id : ?Principal;
    context : Blob;
    key_id : VetKdKeyId;
  };
  type VetKdPublicKeyResponse = { public_key : Blob };
  type VetKdDeriveKeyRequest = {
    input : Blob;
    context : Blob;
    transport_public_key : Blob;
    key_id : VetKdKeyId;
  };
  type VetKdDeriveKeyResponse = { encrypted_key : Blob };

  let vetkdManagementCanister : actor {
    vetkd_public_key : (VetKdPublicKeyRequest) -> async VetKdPublicKeyResponse;
    vetkd_derive_key : (VetKdDeriveKeyRequest) -> async VetKdDeriveKeyResponse;
  } = actor "aaaaa-aa";

  let vetkdContext : Blob = "orbita_crm_v1".encodeUtf8();

  // Requires authenticated caller -- public key is safe to return to any
  // authenticated user since it is the same for the whole canister.
  public shared ({ caller }) func vetkdPublicKey() : async Blob {
    requireUser(caller);
    let response = await vetkdManagementCanister.vetkd_public_key({
      canister_id = null;
      context = vetkdContext;
      key_id = { curve = #bls12_381_g2; name = "key_1" };
    });
    response.public_key
  };

  // Derives a caller-specific encrypted key. Auth and rate limit checked
  // before the async call to avoid any async-safety issues.
  public shared ({ caller }) func vetkdDeriveKey(transportPublicKey : Blob) : async Blob {
    requireUser(caller);
    rateLimit(caller);
    let response = await (with cycles = 26_000_000_000) vetkdManagementCanister.vetkd_derive_key({
      input = caller.toBlob();
      context = vetkdContext;
      transport_public_key = transportPublicKey;
      key_id = { curve = #bls12_381_g2; name = "key_1" };
    });
    response.encrypted_key
  };
};
