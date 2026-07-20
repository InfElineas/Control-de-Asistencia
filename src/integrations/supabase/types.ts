export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.1"
  }
  graphql_public: {
    Tables: {
      [_ in never]: never
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      graphql: {
        Args: {
          extensions?: Json
          operationName?: string
          query?: string
          variables?: Json
        }
        Returns: Json
      }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
  public: {
    Tables: {
      activos: {
        Row: {
          assigned_to: string | null
          assigned_to_name: string | null
          created_date: string | null
          department: string | null
          estado: string | null
          fecha_adquisicion: string | null
          id: string
          marca: string | null
          modelo: string | null
          nombre: string | null
          notas: string | null
          numero_serie: string | null
          tipo: string | null
          updated_date: string | null
        }
        Insert: {
          assigned_to?: string | null
          assigned_to_name?: string | null
          created_date?: string | null
          department?: string | null
          estado?: string | null
          fecha_adquisicion?: string | null
          id?: string
          marca?: string | null
          modelo?: string | null
          nombre?: string | null
          notas?: string | null
          numero_serie?: string | null
          tipo?: string | null
          updated_date?: string | null
        }
        Update: {
          assigned_to?: string | null
          assigned_to_name?: string | null
          created_date?: string | null
          department?: string | null
          estado?: string | null
          fecha_adquisicion?: string | null
          id?: string
          marca?: string | null
          modelo?: string | null
          nombre?: string | null
          notas?: string | null
          numero_serie?: string | null
          tipo?: string | null
          updated_date?: string | null
        }
        Relationships: []
      }
      app_config: {
        Row: {
          description: string | null
          id: string
          key: string
          updated_at: string
          value: Json
        }
        Insert: {
          description?: string | null
          id?: string
          key: string
          updated_at?: string
          value: Json
        }
        Update: {
          description?: string | null
          id?: string
          key?: string
          updated_at?: string
          value?: Json
        }
        Relationships: []
      }
      app_users: {
        Row: {
          avatar_url: string | null
          created_date: string | null
          department: string | null
          department_id: string | null
          display_name: string | null
          email: string | null
          full_name: string | null
          id: string
          role: string | null
          updated_date: string | null
        }
        Insert: {
          avatar_url?: string | null
          created_date?: string | null
          department?: string | null
          department_id?: string | null
          display_name?: string | null
          email?: string | null
          full_name?: string | null
          id?: string
          role?: string | null
          updated_date?: string | null
        }
        Update: {
          avatar_url?: string | null
          created_date?: string | null
          department?: string | null
          department_id?: string | null
          display_name?: string | null
          email?: string | null
          full_name?: string | null
          id?: string
          role?: string | null
          updated_date?: string | null
        }
        Relationships: []
      }
      attendance_absence_reviews: {
        Row: {
          created_at: string
          date: string
          id: string
          is_justified: boolean
          notes: string | null
          reviewed_at: string
          reviewed_by: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          date: string
          id?: string
          is_justified: boolean
          notes?: string | null
          reviewed_at?: string
          reviewed_by?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          date?: string
          id?: string
          is_justified?: boolean
          notes?: string | null
          reviewed_at?: string
          reviewed_by?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      attendance_daily_facts: {
        Row: {
          absence_justification: string | null
          created_at: string
          date: string
          department_id: string | null
          id: string
          in_marks_count: number
          in_timestamp: string | null
          late_minutes: number
          out_marks_count: number
          out_timestamp: string | null
          outside_geofence_count: number
          rule_version_id: string | null
          source_reason: string
          source_updated_at: string
          status: string
          updated_at: string
          user_id: string
          worked_minutes: number
        }
        Insert: {
          absence_justification?: string | null
          created_at?: string
          date: string
          department_id?: string | null
          id?: string
          in_marks_count?: number
          in_timestamp?: string | null
          late_minutes?: number
          out_marks_count?: number
          out_timestamp?: string | null
          outside_geofence_count?: number
          rule_version_id?: string | null
          source_reason?: string
          source_updated_at?: string
          status: string
          updated_at?: string
          user_id: string
          worked_minutes?: number
        }
        Update: {
          absence_justification?: string | null
          created_at?: string
          date?: string
          department_id?: string | null
          id?: string
          in_marks_count?: number
          in_timestamp?: string | null
          late_minutes?: number
          out_marks_count?: number
          out_timestamp?: string | null
          outside_geofence_count?: number
          rule_version_id?: string | null
          source_reason?: string
          source_updated_at?: string
          status?: string
          updated_at?: string
          user_id?: string
          worked_minutes?: number
        }
        Relationships: [
          {
            foreignKeyName: "attendance_daily_facts_department_id_fkey"
            columns: ["department_id"]
            isOneToOne: false
            referencedRelation: "departments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "attendance_daily_facts_rule_version_id_fkey"
            columns: ["rule_version_id"]
            isOneToOne: false
            referencedRelation: "attendance_rule_versions"
            referencedColumns: ["id"]
          },
        ]
      }
      attendance_incidents: {
        Row: {
          created_at: string
          id: string
          incident_type: string
          manager_notes: string | null
          reason: string | null
          requested_at: string
          reviewed_at: string | null
          reviewed_by: string | null
          status: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          incident_type: string
          manager_notes?: string | null
          reason?: string | null
          requested_at: string
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          incident_type?: string
          manager_notes?: string | null
          reason?: string | null
          requested_at?: string
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      attendance_marks: {
        Row: {
          accuracy: number | null
          block_reason: string | null
          blocked: boolean
          created_at: string
          distance_to_center: number | null
          id: string
          inside_geofence: boolean
          latitude: number | null
          longitude: number | null
          mark_type: string
          timestamp: string
          user_id: string
          work_location_id: string | null
        }
        Insert: {
          accuracy?: number | null
          block_reason?: string | null
          blocked?: boolean
          created_at?: string
          distance_to_center?: number | null
          id?: string
          inside_geofence?: boolean
          latitude?: number | null
          longitude?: number | null
          mark_type: string
          timestamp?: string
          user_id: string
          work_location_id?: string | null
        }
        Update: {
          accuracy?: number | null
          block_reason?: string | null
          blocked?: boolean
          created_at?: string
          distance_to_center?: number | null
          id?: string
          inside_geofence?: boolean
          latitude?: number | null
          longitude?: number | null
          mark_type?: string
          timestamp?: string
          user_id?: string
          work_location_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "attendance_marks_work_location_id_fkey"
            columns: ["work_location_id"]
            isOneToOne: false
            referencedRelation: "work_locations"
            referencedColumns: ["id"]
          },
        ]
      }
      attendance_rule_versions: {
        Row: {
          activated_at: string | null
          config: Json
          created_at: string
          description: string | null
          id: string
          is_active: boolean
          version: string
        }
        Insert: {
          activated_at?: string | null
          config?: Json
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean
          version: string
        }
        Update: {
          activated_at?: string | null
          config?: Json
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean
          version?: string
        }
        Relationships: []
      }
      audit_log: {
        Row: {
          action: string
          created_at: string
          description: string | null
          id: string
          metadata: Json
          new_data: Json | null
          old_data: Json | null
          record_id: string | null
          source_ip: string | null
          table_name: string | null
          user_id: string | null
        }
        Insert: {
          action: string
          created_at?: string
          description?: string | null
          id?: string
          metadata?: Json
          new_data?: Json | null
          old_data?: Json | null
          record_id?: string | null
          source_ip?: string | null
          table_name?: string | null
          user_id?: string | null
        }
        Update: {
          action?: string
          created_at?: string
          description?: string | null
          id?: string
          metadata?: Json
          new_data?: Json | null
          old_data?: Json | null
          record_id?: string | null
          source_ip?: string | null
          table_name?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      audit_logs: {
        Row: {
          action: string
          by_user_id: string | null
          by_user_name: string | null
          created_date: string | null
          entity_id: string | null
          entity_title: string | null
          entity_type: string
          field_changed: string | null
          id: string
          new_value: string | null
          old_value: string | null
          snapshot: string | null
        }
        Insert: {
          action: string
          by_user_id?: string | null
          by_user_name?: string | null
          created_date?: string | null
          entity_id?: string | null
          entity_title?: string | null
          entity_type: string
          field_changed?: string | null
          id?: string
          new_value?: string | null
          old_value?: string | null
          snapshot?: string | null
        }
        Update: {
          action?: string
          by_user_id?: string | null
          by_user_name?: string | null
          created_date?: string | null
          entity_id?: string | null
          entity_title?: string | null
          entity_type?: string
          field_changed?: string | null
          id?: string
          new_value?: string | null
          old_value?: string | null
          snapshot?: string | null
        }
        Relationships: []
      }
      automation_logs: {
        Row: {
          actions_executed: Json | null
          created_date: string | null
          id: string
          request_id: string | null
          rule_id: string | null
          triggered_at: string | null
        }
        Insert: {
          actions_executed?: Json | null
          created_date?: string | null
          id?: string
          request_id?: string | null
          rule_id?: string | null
          triggered_at?: string | null
        }
        Update: {
          actions_executed?: Json | null
          created_date?: string | null
          id?: string
          request_id?: string | null
          rule_id?: string | null
          triggered_at?: string | null
        }
        Relationships: []
      }
      automation_rules: {
        Row: {
          actions: Json | null
          conditions: Json | null
          created_date: string | null
          id: string
          is_active: boolean | null
          name: string | null
          trigger_type: string | null
          updated_date: string | null
        }
        Insert: {
          actions?: Json | null
          conditions?: Json | null
          created_date?: string | null
          id?: string
          is_active?: boolean | null
          name?: string | null
          trigger_type?: string | null
          updated_date?: string | null
        }
        Update: {
          actions?: Json | null
          conditions?: Json | null
          created_date?: string | null
          id?: string
          is_active?: boolean | null
          name?: string | null
          trigger_type?: string | null
          updated_date?: string | null
        }
        Relationships: []
      }
      chat_logs: {
        Row: {
          created_date: string | null
          entity_id: string | null
          entity_type: string | null
          id: string
          message: string | null
          sender_id: string | null
          sender_name: string | null
        }
        Insert: {
          created_date?: string | null
          entity_id?: string | null
          entity_type?: string | null
          id?: string
          message?: string | null
          sender_id?: string | null
          sender_name?: string | null
        }
        Update: {
          created_date?: string | null
          entity_id?: string | null
          entity_type?: string | null
          id?: string
          message?: string | null
          sender_id?: string | null
          sender_name?: string | null
        }
        Relationships: []
      }
      department_schedules: {
        Row: {
          allow_early_checkin: boolean
          allow_late_checkout: boolean
          checkin_end_time: string
          checkin_start_time: string
          checkout_end_time: string | null
          checkout_start_time: string | null
          created_at: string
          department_id: string
          id: string
          timezone: string
          updated_at: string
        }
        Insert: {
          allow_early_checkin?: boolean
          allow_late_checkout?: boolean
          checkin_end_time?: string
          checkin_start_time?: string
          checkout_end_time?: string | null
          checkout_start_time?: string | null
          created_at?: string
          department_id: string
          id?: string
          timezone?: string
          updated_at?: string
        }
        Update: {
          allow_early_checkin?: boolean
          allow_late_checkout?: boolean
          checkin_end_time?: string
          checkin_start_time?: string
          checkout_end_time?: string | null
          checkout_start_time?: string | null
          created_at?: string
          department_id?: string
          id?: string
          timezone?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "department_schedules_department_id_fkey"
            columns: ["department_id"]
            isOneToOne: true
            referencedRelation: "departments"
            referencedColumns: ["id"]
          },
        ]
      }
      departments: {
        Row: {
          created_at: string
          id: string
          is_paused: boolean
          name: string
          pause_reason: string | null
          paused_at: string | null
          rest_groups_enabled: boolean
        }
        Insert: {
          created_at?: string
          id?: string
          is_paused?: boolean
          name: string
          pause_reason?: string | null
          paused_at?: string | null
          rest_groups_enabled?: boolean
        }
        Update: {
          created_at?: string
          id?: string
          is_paused?: boolean
          name?: string
          pause_reason?: string | null
          paused_at?: string | null
          rest_groups_enabled?: boolean
        }
        Relationships: []
      }
      geofence_config: {
        Row: {
          accuracy_threshold: number
          block_on_poor_accuracy: boolean
          center_lat: number
          center_lng: number
          id: string
          radius_meters: number
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          accuracy_threshold?: number
          block_on_poor_accuracy?: boolean
          center_lat?: number
          center_lng?: number
          id?: string
          radius_meters?: number
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          accuracy_threshold?: number
          block_on_poor_accuracy?: boolean
          center_lat?: number
          center_lng?: number
          id?: string
          radius_meters?: number
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: []
      }
      guardias: {
        Row: {
          creada_por: string | null
          creada_por_nombre: string | null
          created_date: string | null
          estado: string | null
          fin: string | null
          id: string
          inicio: string | null
          observaciones: string | null
          reemplazado_por_id: string | null
          reemplazado_por_nombre: string | null
          tecnico_id: string | null
          tecnico_nombre: string | null
          tipo: string | null
          updated_date: string | null
        }
        Insert: {
          creada_por?: string | null
          creada_por_nombre?: string | null
          created_date?: string | null
          estado?: string | null
          fin?: string | null
          id?: string
          inicio?: string | null
          observaciones?: string | null
          reemplazado_por_id?: string | null
          reemplazado_por_nombre?: string | null
          tecnico_id?: string | null
          tecnico_nombre?: string | null
          tipo?: string | null
          updated_date?: string | null
        }
        Update: {
          creada_por?: string | null
          creada_por_nombre?: string | null
          created_date?: string | null
          estado?: string | null
          fin?: string | null
          id?: string
          inicio?: string | null
          observaciones?: string | null
          reemplazado_por_id?: string | null
          reemplazado_por_nombre?: string | null
          tecnico_id?: string | null
          tecnico_nombre?: string | null
          tipo?: string | null
          updated_date?: string | null
        }
        Relationships: []
      }
      incidents: {
        Row: {
          activo_id: string | null
          activo_nombre: string | null
          assigned_to: string | null
          assigned_to_name: string | null
          category: string | null
          created_by: string | null
          created_date: string | null
          department: string | null
          description: string | null
          file_urls: Json | null
          id: string
          impact: string | null
          reporter_email: string | null
          reporter_name: string | null
          resolution_hours: number | null
          resolution_notes: string | null
          resolved_at: string | null
          status: string | null
          tool_name: string | null
          updated_date: string | null
        }
        Insert: {
          activo_id?: string | null
          activo_nombre?: string | null
          assigned_to?: string | null
          assigned_to_name?: string | null
          category?: string | null
          created_by?: string | null
          created_date?: string | null
          department?: string | null
          description?: string | null
          file_urls?: Json | null
          id?: string
          impact?: string | null
          reporter_email?: string | null
          reporter_name?: string | null
          resolution_hours?: number | null
          resolution_notes?: string | null
          resolved_at?: string | null
          status?: string | null
          tool_name?: string | null
          updated_date?: string | null
        }
        Update: {
          activo_id?: string | null
          activo_nombre?: string | null
          assigned_to?: string | null
          assigned_to_name?: string | null
          category?: string | null
          created_by?: string | null
          created_date?: string | null
          department?: string | null
          description?: string | null
          file_urls?: Json | null
          id?: string
          impact?: string | null
          reporter_email?: string | null
          reporter_name?: string | null
          resolution_hours?: number | null
          resolution_notes?: string | null
          resolved_at?: string | null
          status?: string | null
          tool_name?: string | null
          updated_date?: string | null
        }
        Relationships: []
      }
      knowledge_base: {
        Row: {
          author_id: string | null
          author_name: string | null
          category: string | null
          content: string | null
          created_date: string | null
          id: string
          tags: Json | null
          title: string | null
          updated_date: string | null
        }
        Insert: {
          author_id?: string | null
          author_name?: string | null
          category?: string | null
          content?: string | null
          created_date?: string | null
          id?: string
          tags?: Json | null
          title?: string | null
          updated_date?: string | null
        }
        Update: {
          author_id?: string | null
          author_name?: string | null
          category?: string | null
          content?: string | null
          created_date?: string | null
          id?: string
          tags?: Json | null
          title?: string | null
          updated_date?: string | null
        }
        Relationships: []
      }
      notifications: {
        Row: {
          created_at: string
          id: string
          is_read: boolean
          link: string | null
          message: string
          metadata: Json
          read_at: string | null
          title: string
          type: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_read?: boolean
          link?: string | null
          message: string
          metadata?: Json
          read_at?: string | null
          title: string
          type?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          is_read?: boolean
          link?: string | null
          message?: string
          metadata?: Json
          read_at?: string | null
          title?: string
          type?: string
          user_id?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          contract_cancelled_at: string | null
          created_at: string
          deactivated_at: string | null
          deactivated_by: string | null
          deactivation_reason: string | null
          department_id: string
          email: string
          full_name: string
          id: string
          is_active: boolean
          last_connection_at: string | null
          phone: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          contract_cancelled_at?: string | null
          created_at?: string
          deactivated_at?: string | null
          deactivated_by?: string | null
          deactivation_reason?: string | null
          department_id: string
          email: string
          full_name: string
          id?: string
          is_active?: boolean
          last_connection_at?: string | null
          phone?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          contract_cancelled_at?: string | null
          created_at?: string
          deactivated_at?: string | null
          deactivated_by?: string | null
          deactivation_reason?: string | null
          department_id?: string
          email?: string
          full_name?: string
          id?: string
          is_active?: boolean
          last_connection_at?: string | null
          phone?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "profiles_department_id_fkey"
            columns: ["department_id"]
            isOneToOne: false
            referencedRelation: "departments"
            referencedColumns: ["id"]
          },
        ]
      }
      report_runs: {
        Row: {
          artifact_bucket: string | null
          artifact_path: string | null
          checksum: string | null
          created_at: string
          department_id: string | null
          duration_ms: number | null
          error: string | null
          filters: Json
          finished_at: string | null
          id: string
          period_end: string
          period_start: string
          requested_by: string
          retry_count: number
          row_count: number | null
          rule_version_id: string | null
          rules_params: Json
          rules_version: string
          scope: string
          started_at: string | null
          status: string
          updated_at: string
        }
        Insert: {
          artifact_bucket?: string | null
          artifact_path?: string | null
          checksum?: string | null
          created_at?: string
          department_id?: string | null
          duration_ms?: number | null
          error?: string | null
          filters?: Json
          finished_at?: string | null
          id?: string
          period_end: string
          period_start: string
          requested_by: string
          retry_count?: number
          row_count?: number | null
          rule_version_id?: string | null
          rules_params?: Json
          rules_version?: string
          scope: string
          started_at?: string | null
          status?: string
          updated_at?: string
        }
        Update: {
          artifact_bucket?: string | null
          artifact_path?: string | null
          checksum?: string | null
          created_at?: string
          department_id?: string | null
          duration_ms?: number | null
          error?: string | null
          filters?: Json
          finished_at?: string | null
          id?: string
          period_end?: string
          period_start?: string
          requested_by?: string
          retry_count?: number
          row_count?: number | null
          rule_version_id?: string | null
          rules_params?: Json
          rules_version?: string
          scope?: string
          started_at?: string | null
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "report_runs_department_id_fkey"
            columns: ["department_id"]
            isOneToOne: false
            referencedRelation: "departments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "report_runs_rule_version_id_fkey"
            columns: ["rule_version_id"]
            isOneToOne: false
            referencedRelation: "attendance_rule_versions"
            referencedColumns: ["id"]
          },
        ]
      }
      request_comments: {
        Row: {
          author_id: string | null
          author_name: string | null
          content: string | null
          created_date: string | null
          file_urls: Json | null
          id: string
          mentioned_users: Json | null
          request_id: string | null
        }
        Insert: {
          author_id?: string | null
          author_name?: string | null
          content?: string | null
          created_date?: string | null
          file_urls?: Json | null
          id?: string
          mentioned_users?: Json | null
          request_id?: string | null
        }
        Update: {
          author_id?: string | null
          author_name?: string | null
          content?: string | null
          created_date?: string | null
          file_urls?: Json | null
          id?: string
          mentioned_users?: Json | null
          request_id?: string | null
        }
        Relationships: []
      }
      request_feedback: {
        Row: {
          by_user_id: string | null
          by_user_name: string | null
          comment: string | null
          created_date: string | null
          id: string
          rating: string | null
          request_id: string | null
        }
        Insert: {
          by_user_id?: string | null
          by_user_name?: string | null
          comment?: string | null
          created_date?: string | null
          id?: string
          rating?: string | null
          request_id?: string | null
        }
        Update: {
          by_user_id?: string | null
          by_user_name?: string | null
          comment?: string | null
          created_date?: string | null
          id?: string
          rating?: string | null
          request_id?: string | null
        }
        Relationships: []
      }
      request_histories: {
        Row: {
          by_user_id: string | null
          by_user_name: string | null
          created_date: string | null
          from_status: string | null
          id: string
          note: string | null
          request_id: string | null
          to_status: string | null
        }
        Insert: {
          by_user_id?: string | null
          by_user_name?: string | null
          created_date?: string | null
          from_status?: string | null
          id?: string
          note?: string | null
          request_id?: string | null
          to_status?: string | null
        }
        Update: {
          by_user_id?: string | null
          by_user_name?: string | null
          created_date?: string | null
          from_status?: string | null
          id?: string
          note?: string | null
          request_id?: string | null
          to_status?: string | null
        }
        Relationships: []
      }
      request_trash: {
        Row: {
          created_date: string | null
          deleted_by: string | null
          deleted_by_name: string | null
          id: string
          request_id: string | null
          title: string | null
        }
        Insert: {
          created_date?: string | null
          deleted_by?: string | null
          deleted_by_name?: string | null
          id?: string
          request_id?: string | null
          title?: string | null
        }
        Update: {
          created_date?: string | null
          deleted_by?: string | null
          deleted_by_name?: string | null
          id?: string
          request_id?: string | null
          title?: string | null
        }
        Relationships: []
      }
      requests: {
        Row: {
          actual_hours: number | null
          approval_notes: string | null
          approved_at: string | null
          approved_by: string | null
          approved_by_name: string | null
          assigned_to_id: string | null
          assigned_to_name: string | null
          completion_date: string | null
          created_date: string | null
          department_ids: Json | null
          department_names: Json | null
          description: string | null
          estimated_due: string | null
          estimated_hours: number | null
          file_urls: Json | null
          id: string
          is_deleted: boolean | null
          level: string | null
          priority: string | null
          rejection_reason: string | null
          request_type: string | null
          requester_id: string | null
          requester_name: string | null
          started_at: string | null
          status: string | null
          title: string | null
          updated_date: string | null
        }
        Insert: {
          actual_hours?: number | null
          approval_notes?: string | null
          approved_at?: string | null
          approved_by?: string | null
          approved_by_name?: string | null
          assigned_to_id?: string | null
          assigned_to_name?: string | null
          completion_date?: string | null
          created_date?: string | null
          department_ids?: Json | null
          department_names?: Json | null
          description?: string | null
          estimated_due?: string | null
          estimated_hours?: number | null
          file_urls?: Json | null
          id?: string
          is_deleted?: boolean | null
          level?: string | null
          priority?: string | null
          rejection_reason?: string | null
          request_type?: string | null
          requester_id?: string | null
          requester_name?: string | null
          started_at?: string | null
          status?: string | null
          title?: string | null
          updated_date?: string | null
        }
        Update: {
          actual_hours?: number | null
          approval_notes?: string | null
          approved_at?: string | null
          approved_by?: string | null
          approved_by_name?: string | null
          assigned_to_id?: string | null
          assigned_to_name?: string | null
          completion_date?: string | null
          created_date?: string | null
          department_ids?: Json | null
          department_names?: Json | null
          description?: string | null
          estimated_due?: string | null
          estimated_hours?: number | null
          file_urls?: Json | null
          id?: string
          is_deleted?: boolean | null
          level?: string | null
          priority?: string | null
          rejection_reason?: string | null
          request_type?: string | null
          requester_id?: string | null
          requester_name?: string | null
          started_at?: string | null
          status?: string | null
          title?: string | null
          updated_date?: string | null
        }
        Relationships: []
      }
      rest_group_members: {
        Row: {
          created_at: string
          effective_from: string
          group_id: string
          id: string
          notes: string | null
          user_id: string
        }
        Insert: {
          created_at?: string
          effective_from?: string
          group_id: string
          id?: string
          notes?: string | null
          user_id: string
        }
        Update: {
          created_at?: string
          effective_from?: string
          group_id?: string
          id?: string
          notes?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "rest_group_members_group_id_fkey"
            columns: ["group_id"]
            isOneToOne: false
            referencedRelation: "rest_groups"
            referencedColumns: ["id"]
          },
        ]
      }
      rest_groups: {
        Row: {
          created_at: string
          days_of_week: number[]
          department_id: string
          id: string
          name: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          days_of_week?: number[]
          department_id: string
          id?: string
          name: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          days_of_week?: number[]
          department_id?: string
          id?: string
          name?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "rest_groups_department_id_fkey"
            columns: ["department_id"]
            isOneToOne: false
            referencedRelation: "departments"
            referencedColumns: ["id"]
          },
        ]
      }
      user_department_responsibilities: {
        Row: {
          created_at: string
          created_by: string | null
          department_id: string
          id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          department_id: string
          id?: string
          user_id: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          department_id?: string
          id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_department_responsibilities_department_id_fkey"
            columns: ["department_id"]
            isOneToOne: false
            referencedRelation: "departments"
            referencedColumns: ["id"]
          },
        ]
      }
      user_rest_schedule: {
        Row: {
          created_at: string
          days_of_week: number[]
          effective_from: string
          id: string
          notes: string | null
          user_id: string
        }
        Insert: {
          created_at?: string
          days_of_week?: number[]
          effective_from?: string
          id?: string
          notes?: string | null
          user_id: string
        }
        Update: {
          created_at?: string
          days_of_week?: number[]
          effective_from?: string
          id?: string
          notes?: string | null
          user_id?: string
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
      vacation_requests: {
        Row: {
          created_at: string
          department_id: string
          end_date: string
          id: string
          reason: string | null
          requested_days: number
          review_comment: string | null
          reviewed_at: string | null
          reviewed_by: string | null
          start_date: string
          status: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          department_id: string
          end_date: string
          id?: string
          reason?: string | null
          requested_days: number
          review_comment?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          start_date: string
          status?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          department_id?: string
          end_date?: string
          id?: string
          reason?: string | null
          requested_days?: number
          review_comment?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          start_date?: string
          status?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "vacation_requests_department_id_fkey"
            columns: ["department_id"]
            isOneToOne: false
            referencedRelation: "departments"
            referencedColumns: ["id"]
          },
        ]
      }
      work_calendar: {
        Row: {
          created_at: string
          date: string
          department_id: string
          id: string
          is_workday: boolean
          late_tolerance_minutes: number
          notes: string | null
        }
        Insert: {
          created_at?: string
          date: string
          department_id: string
          id?: string
          is_workday?: boolean
          late_tolerance_minutes?: number
          notes?: string | null
        }
        Update: {
          created_at?: string
          date?: string
          department_id?: string
          id?: string
          is_workday?: boolean
          late_tolerance_minutes?: number
          notes?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "work_calendar_department_id_fkey"
            columns: ["department_id"]
            isOneToOne: false
            referencedRelation: "departments"
            referencedColumns: ["id"]
          },
        ]
      }
      work_locations: {
        Row: {
          accuracy_threshold: number
          block_on_poor_accuracy: boolean
          center_lat: number
          center_lng: number
          created_at: string
          id: string
          is_active: boolean
          name: string
          radius_meters: number
          updated_at: string
        }
        Insert: {
          accuracy_threshold?: number
          block_on_poor_accuracy?: boolean
          center_lat: number
          center_lng: number
          created_at?: string
          id?: string
          is_active?: boolean
          name: string
          radius_meters?: number
          updated_at?: string
        }
        Update: {
          accuracy_threshold?: number
          block_on_poor_accuracy?: boolean
          center_lat?: number
          center_lng?: number
          created_at?: string
          id?: string
          is_active?: boolean
          name?: string
          radius_meters?: number
          updated_at?: string
        }
        Relationships: []
      }
      worklogs: {
        Row: {
          created_date: string | null
          id: string
          minutes: number | null
          note: string | null
          request_id: string | null
          user_id: string | null
          user_name: string | null
        }
        Insert: {
          created_date?: string | null
          id?: string
          minutes?: number | null
          note?: string | null
          request_id?: string | null
          user_id?: string | null
          user_name?: string | null
        }
        Update: {
          created_date?: string | null
          id?: string
          minutes?: number | null
          note?: string | null
          request_id?: string | null
          user_id?: string | null
          user_name?: string | null
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      cancel_vacation_request: {
        Args: { _request_id: string }
        Returns: {
          created_at: string
          department_id: string
          end_date: string
          id: string
          reason: string | null
          requested_days: number
          review_comment: string | null
          reviewed_at: string | null
          reviewed_by: string | null
          start_date: string
          status: string
          updated_at: string
          user_id: string
        }
        SetofOptions: {
          from: "*"
          to: "vacation_requests"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      compute_daily_attendance_status: {
        Args: {
          _checkin_end_time: string
          _department_paused: boolean
          _in_timestamp: string
          _timezone: string
        }
        Returns: string
      }
      execute_superadmin_sql: { Args: { _query: string }; Returns: Json }
      get_active_attendance_rule_version_id: { Args: never; Returns: string }
      get_attendance_report_monthly: {
        Args: {
          _department_id?: string
          _from: string
          _include_heads?: boolean
          _scope?: string
          _to: string
        }
        Returns: {
          absence_justification: string
          date: string
          department: string
          distance_m: number
          employee_email: string
          employee_name: string
          in_timestamp: string
          inside_geofence: boolean
          lateness_minutes: number
          out_timestamp: string
          status: string
          user_id: string
        }[]
      }
      get_report_runs_operational_kpis: {
        Args: { _from?: string }
        Returns: {
          availability_pct: number
          avg_duration_ms: number
          completed_runs: number
          error_rate_pct: number
          failed_runs: number
          p95_duration_ms: number
          rows_processed: number
          total_runs: number
        }[]
      }
      get_report_runs_operational_kpis_v2: {
        Args: { _department_id?: string; _from?: string; _scope?: string }
        Returns: {
          availability_pct: number
          avg_duration_ms: number
          completed_runs: number
          error_rate_pct: number
          failed_runs: number
          p95_duration_ms: number
          rows_processed: number
          total_runs: number
        }[]
      }
      get_user_department: { Args: { _user_id: string }; Returns: string }
      get_vacation_accrual_rate: { Args: never; Returns: number }
      get_vacation_balance: {
        Args: { _user_id: string; _year?: number }
        Returns: {
          accrual_rate: number
          approved_days: number
          available_days: number
          earned_days: number
          pending_days: number
          worked_days: number
        }[]
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      is_global_manager: { Args: { _user_id: string }; Returns: boolean }
      is_head_of_department: {
        Args: { _dept_id: string; _user_id: string }
        Returns: boolean
      }
      is_superadmin:
        | { Args: never; Returns: boolean }
        | { Args: { _user_id: string }; Returns: boolean }
      refresh_attendance_daily_facts: {
        Args: { _reason?: string; _target_date?: string; _user_id?: string }
        Returns: number
      }
      refresh_attendance_daily_facts_for_range: {
        Args: {
          _from: string
          _reason?: string
          _to: string
          _user_id?: string
        }
        Returns: number
      }
      request_vacation: {
        Args: { _end_date: string; _reason?: string; _start_date: string }
        Returns: {
          created_at: string
          department_id: string
          end_date: string
          id: string
          reason: string | null
          requested_days: number
          review_comment: string | null
          reviewed_at: string | null
          reviewed_by: string | null
          start_date: string
          status: string
          updated_at: string
          user_id: string
        }
        SetofOptions: {
          from: "*"
          to: "vacation_requests"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      review_vacation_request: {
        Args: {
          _decision: string
          _request_id: string
          _review_comment?: string
        }
        Returns: {
          created_at: string
          department_id: string
          end_date: string
          id: string
          reason: string | null
          requested_days: number
          review_comment: string | null
          reviewed_at: string | null
          reviewed_by: string | null
          start_date: string
          status: string
          updated_at: string
          user_id: string
        }
        SetofOptions: {
          from: "*"
          to: "vacation_requests"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      validate_attendance_mark: {
        Args: { _mark_type: string; _user_id: string }
        Returns: {
          allowed: boolean
          department_id: string
          reason: string
        }[]
      }
    }
    Enums: {
      app_role: "employee" | "department_head" | "global_manager" | "superadmin"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  graphql_public: {
    Enums: {},
  },
  public: {
    Enums: {
      app_role: ["employee", "department_head", "global_manager", "superadmin"],
    },
  },
} as const
