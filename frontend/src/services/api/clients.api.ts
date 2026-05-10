// DEPRECATED: Client + Vendor merged into Partner.
// This file re-exports from partners.api.ts for backward compatibility.
// Update imports to use partners.api.ts directly.

export {
  getPartners as getClients,
  createPartner as createClient,
  updatePartner as updateClient,
  deletePartner as deleteClient,
} from './partners.api'
