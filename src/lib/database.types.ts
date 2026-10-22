/**
 * Datenbanktypen für supabase-js.
 * Von Hand passend zu supabase/migrations geschrieben. Mit verlinktem Projekt
 * lassen sie sich über `npm run db:types` neu generieren.
 */

export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[]

type OrganisationType = 'school' | 'lost_property_office' | 'company' | 'other'
type ItemCategory =
  | 'electronics'
  | 'clothing'
  | 'keys'
  | 'bags'
  | 'wallets'
  | 'jewellery'
  | 'sports'
  | 'other'
type ItemColor =
  | 'black'
  | 'white'
  | 'grey'
  | 'blue'
  | 'red'
  | 'green'
  | 'yellow'
  | 'brown'
  | 'pink'
  | 'gold'
  | 'silver'
  | 'multicolor'
  | 'other'
type ItemStatus = 'available' | 'reserved' | 'returned'
type RequestStatus = 'open' | 'confirmed' | 'rejected' | 'completed'
type LossReportStatus = 'open' | 'closed'

export type Database = {
  public: {
    Tables: {
      organisations: {
        Row: {
          id: string
          slug: string
          name: string
          type: OrganisationType
          short_code: string
          address: string
          next_item_seq: number
          created_at: string
        }
        Insert: never
        Update: { name?: string; type?: OrganisationType; address?: string }
        Relationships: []
      }
      found_offices: {
        Row: {
          id: string
          organisation_id: string
          name: string
          location: string
          contact_email: string
          contact_phone: string | null
          opening_hours: string
          pickup_notes: string | null
          created_at: string
        }
        Insert: never
        Update: {
          name?: string
          location?: string
          contact_email?: string
          contact_phone?: string | null
          opening_hours?: string
          pickup_notes?: string | null
        }
        Relationships: [
          {
            foreignKeyName: 'found_offices_organisation_id_fkey'
            columns: ['organisation_id']
            isOneToOne: true
            referencedRelation: 'organisations'
            referencedColumns: ['id']
          },
        ]
      }
      memberships: {
        Row: { user_id: string; organisation_id: string; full_name: string; created_at: string }
        Insert: never
        Update: never
        Relationships: [
          {
            foreignKeyName: 'memberships_organisation_id_fkey'
            columns: ['organisation_id']
            isOneToOne: false
            referencedRelation: 'organisations'
            referencedColumns: ['id']
          },
        ]
      }
      found_items: {
        Row: {
          id: string
          organisation_id: string
          item_number: string
          title: string
          category: ItemCategory
          color: ItemColor
          brand: string | null
          found_on: string
          found_location: string
          public_description: string
          photo_path: string | null
          status: ItemStatus
          is_public: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          organisation_id: string
          title: string
          category: ItemCategory
          color: ItemColor
          brand?: string | null
          found_on: string
          found_location: string
          public_description?: string
          photo_path?: string | null
          is_public?: boolean
        }
        Update: {
          title?: string
          category?: ItemCategory
          color?: ItemColor
          brand?: string | null
          found_on?: string
          found_location?: string
          public_description?: string
          photo_path?: string | null
          is_public?: boolean
        }
        Relationships: [
          {
            foreignKeyName: 'found_items_organisation_id_fkey'
            columns: ['organisation_id']
            isOneToOne: false
            referencedRelation: 'organisations'
            referencedColumns: ['id']
          },
        ]
      }
      found_item_internal: {
        Row: {
          item_id: string
          organisation_id: string
          identifying_feature: string
          internal_note: string
          storage_location: string
        }
        Insert: {
          item_id: string
          organisation_id: string
          identifying_feature?: string
          internal_note?: string
          storage_location?: string
        }
        Update: {
          identifying_feature?: string
          internal_note?: string
          storage_location?: string
        }
        Relationships: [
          {
            foreignKeyName: 'found_item_internal_item_id_fkey'
            columns: ['item_id']
            isOneToOne: true
            referencedRelation: 'found_items'
            referencedColumns: ['id']
          },
        ]
      }
      return_requests: {
        Row: {
          id: string
          item_id: string
          organisation_id: string
          access_token: string
          claimant_name: string
          claimant_contact: string
          message: string
          proof_description: string
          status: RequestStatus
          pickup_instructions: string | null
          decision_note: string | null
          created_at: string
          decided_at: string | null
        }
        Insert: never
        Update: never
        Relationships: [
          {
            foreignKeyName: 'return_requests_item_id_fkey'
            columns: ['item_id']
            isOneToOne: false
            referencedRelation: 'found_items'
            referencedColumns: ['id']
          },
        ]
      }
      loss_reports: {
        Row: {
          id: string
          organisation_id: string | null
          access_token: string
          reporter_name: string
          reporter_contact: string
          title: string
          category: ItemCategory
          color: ItemColor
          brand: string | null
          lost_on: string
          lost_location: string
          description: string
          status: LossReportStatus
          created_at: string
        }
        Insert: never
        Update: never
        Relationships: [
          {
            foreignKeyName: 'loss_reports_organisation_id_fkey'
            columns: ['organisation_id']
            isOneToOne: false
            referencedRelation: 'organisations'
            referencedColumns: ['id']
          },
        ]
      }
      simulated_emails: {
        Row: {
          id: string
          organisation_id: string | null
          return_request_id: string | null
          loss_report_id: string | null
          recipient: string
          link_path: string | null
          subject: string
          body: string
          created_at: string
        }
        Insert: never
        Update: never
        Relationships: []
      }
    }
    Views: { [_ in never]: never }
    Functions: {
      current_organisation_id: { Args: Record<string, never>; Returns: string | null }
      register_organisation: {
        Args: {
          p_full_name: string
          p_org_name: string
          p_org_type: OrganisationType
          p_address: string
          p_office_name: string
          p_office_location: string
          p_contact_email: string
          p_contact_phone: string
          p_opening_hours: string
          p_pickup_notes: string
        }
        Returns: string
      }
      submit_return_request: {
        Args: { p_item_id: string; p_name: string; p_contact: string; p_message: string; p_proof: string }
        Returns: string
      }
      decide_return_request: {
        Args: { p_request_id: string; p_confirm: boolean; p_pickup_instructions?: string; p_note?: string }
        Returns: undefined
      }
      change_item_status: { Args: { p_item_id: string; p_status: ItemStatus }; Returns: undefined }
      submit_loss_report: {
        Args: {
          p_organisation_id: string | null
          p_name: string
          p_contact: string
          p_title: string
          p_category: ItemCategory
          p_color: ItemColor
          p_brand: string
          p_lost_on: string
          p_lost_location: string
          p_description: string
        }
        Returns: string
      }
      notify_loss_report_match: { Args: { p_report_id: string; p_item_id: string }; Returns: boolean }
      close_loss_report: { Args: { p_report_id: string }; Returns: undefined }
      get_return_request_status: { Args: { p_token: string }; Returns: Json }
      get_loss_report: { Args: { p_token: string }; Returns: Json }
      reset_demo: { Args: Record<string, never>; Returns: undefined }
    }
    Enums: {
      organisation_type: OrganisationType
      item_category: ItemCategory
      item_color: ItemColor
      item_status: ItemStatus
      request_status: RequestStatus
      loss_report_status: LossReportStatus
    }
    CompositeTypes: { [_ in never]: never }
  }
}
