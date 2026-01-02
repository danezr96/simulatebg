/* -------------------------------------------------------
 * Supabase Database Types
 * -------------------------------------------------------
 * Handwritten v0 (schema-aligned)
 * Matches: SIMULATEBG — FULL SUPABASE SCHEMA (FINAL)
 * Compatible with @supabase/supabase-js typed client
 * ----------------------------------------------------- */

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export type Database = {
  public: {
    Tables: {
      /* =========================
       * WORLDS & TIME
       * ========================= */
      worlds: {
        Row: {
          id: string;
          name: string;
          mode: string;
          status: string;
          base_round_interval_seconds: number;
          season_id: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          mode?: string;
          status?: string;
          base_round_interval_seconds?: number;
          season_id?: string | null;
          created_at?: string;
        };
        Update: {
          name?: string;
          mode?: string;
          status?: string;
          base_round_interval_seconds?: number;
          season_id?: string | null;
        };
        Relationships: [];
      };

      world_economy_state: {
        Row: {
          world_id: string;
          current_year: number;
          current_week: number;
          base_interest_rate: number;
          inflation_rate: number;
          base_wage_index: number;
          macro_modifiers: Json;
          is_ticking: boolean;
          last_tick_started_at: string | null;
          last_tick_at: string | null;
        };
        Insert: {
          world_id: string;
          current_year?: number;
          current_week?: number;
          base_interest_rate?: number;
          inflation_rate?: number;
          base_wage_index?: number;
          macro_modifiers?: Json;
          is_ticking?: boolean;
          last_tick_started_at?: string | null;
          last_tick_at?: string | null;
        };
        Update: {
          current_year?: number;
          current_week?: number;
          base_interest_rate?: number;
          inflation_rate?: number;
          base_wage_index?: number;
          macro_modifiers?: Json;
          is_ticking?: boolean;
          last_tick_started_at?: string | null;
          last_tick_at?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "world_economy_state_world_id_fkey";
            columns: ["world_id"];
            referencedRelation: "worlds";
            referencedColumns: ["id"];
          }
        ];
      };

      world_rounds: {
        Row: {
          id: string;
          world_id: string;
          year: number;
          week: number;
          engine_version: string;
          random_seed: string;
          status: string;
          started_at: string;
          finished_at: string | null;
        };
        Insert: {
          id?: string;
          world_id: string;
          year: number;
          week: number;
          engine_version: string;
          random_seed: string;
          status?: string;
          started_at?: string;
          finished_at?: string | null;
        };
        Update: {
          status?: string;
          finished_at?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "world_rounds_world_id_fkey";
            columns: ["world_id"];
            referencedRelation: "worlds";
            referencedColumns: ["id"];
          }
        ];
      };

      /* =========================
       * PLAYERS
       * ========================= */
      players: {
        Row: {
          id: string;
          user_id: string;
          name: string;
          avatar_url: string | null;
          bio: string | null;
          play_style: string | null;
          focus_area: string | null;
          base_currency: string;

          brand_rep_level: number;
          brand_rep_xp: number;
          credit_rep_level: number;
          credit_rep_xp: number;

          prestige_level: number;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          name: string;
          avatar_url?: string | null;
          bio?: string | null;
          play_style?: string | null;
          focus_area?: string | null;
          base_currency?: string;

          brand_rep_level?: number;
          brand_rep_xp?: number;
          credit_rep_level?: number;
          credit_rep_xp?: number;

          prestige_level?: number;
          created_at?: string;
        };
        Update: {
          name?: string;
          avatar_url?: string | null;
          bio?: string | null;
          play_style?: string | null;
          focus_area?: string | null;
          base_currency?: string;

          brand_rep_level?: number;
          brand_rep_xp?: number;
          credit_rep_level?: number;
          credit_rep_xp?: number;

          prestige_level?: number;
        };
        Relationships: [];
      };

      player_world_presence: {
        Row: {
          player_id: string;
          world_id: string;
          joined_at: string;
          last_seen_at: string;
        };
        Insert: {
          player_id: string;
          world_id: string;
          joined_at?: string;
          last_seen_at?: string;
        };
        Update: {
          joined_at?: string;
          last_seen_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "player_world_presence_player_id_fkey";
            columns: ["player_id"];
            referencedRelation: "players";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "player_world_presence_world_id_fkey";
            columns: ["world_id"];
            referencedRelation: "worlds";
            referencedColumns: ["id"];
          }
        ];
      };

      player_friends: {
        Row: {
          id: string;
          player_id: string;
          friend_id: string;
          status: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          player_id: string;
          friend_id: string;
          status?: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          status?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "player_friends_player_id_fkey";
            columns: ["player_id"];
            referencedRelation: "players";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "player_friends_friend_id_fkey";
            columns: ["friend_id"];
            referencedRelation: "players";
            referencedColumns: ["id"];
          }
        ];
      };

      player_settings: {
        Row: {
          id: string;
          player_id: string;
          theme: string;
          accent: string;
          ui_density: string;
          reduce_motion: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          player_id: string;
          theme?: string;
          accent?: string;
          ui_density?: string;
          reduce_motion?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          theme?: string;
          accent?: string;
          ui_density?: string;
          reduce_motion?: boolean;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "player_settings_player_id_fkey";
            columns: ["player_id"];
            referencedRelation: "players";
            referencedColumns: ["id"];
          }
        ];
      };

      /* =========================
       * HOLDINGS
       * ========================= */
      holdings: {
        Row: {
          id: string;
          player_id: string;
          world_id: string;

          name: string;
          base_currency: string;
          status: string;
 prestige_level: number;
          cash_balance: number;
          total_equity: number;
          total_debt: number;

          created_at: string;
        };
        Insert: {
          id?: string;
          player_id: string;
          world_id: string;

          name: string;
          base_currency?: string;
          status?: string;
 prestige_level: number;
          cash_balance?: number;
          total_equity?: number;
          total_debt?: number;

          created_at?: string;
        };
        Update: {
          name?: string;
          base_currency?: string;
          status?: string;
 prestige_level: number;
          cash_balance?: number;
          total_equity?: number;
          total_debt?: number;
        };
        Relationships: [
          {
            foreignKeyName: "holdings_player_id_fkey";
            columns: ["player_id"];
            referencedRelation: "players";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "holdings_world_id_fkey";
            columns: ["world_id"];
            referencedRelation: "worlds";
            referencedColumns: ["id"];
          }
        ];
      };

      holding_policies: {
        Row: {
          id: string;
          holding_id: string;
          max_leverage_ratio: number;
          dividend_preference: string;
          risk_appetite: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          holding_id: string;
          max_leverage_ratio?: number;
          dividend_preference?: string;
          risk_appetite?: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          max_leverage_ratio?: number;
          dividend_preference?: string;
          risk_appetite?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "holding_policies_holding_id_fkey";
            columns: ["holding_id"];
            referencedRelation: "holdings";
            referencedColumns: ["id"];
          }
        ];
      };

      /* =========================
       * SECTORS / NICHES
       * ========================= */
      sectors: {
        Row: {
          id: string;
          code: string;
          name: string;
          description: string | null;
          is_active: boolean;
          startup_cost_min_eur: number | null;
          startup_cost_max_eur: number | null;
          startup_cost_avg_eur: number | null;
          startup_cost_median_eur: number | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          code: string;
          name: string;
          description?: string | null;
          is_active?: boolean;
          startup_cost_min_eur?: number | null;
          startup_cost_max_eur?: number | null;
          startup_cost_avg_eur?: number | null;
          startup_cost_median_eur?: number | null;
          created_at?: string;
        };
        Update: {
          code?: string;
          name?: string;
          description?: string | null;
          is_active?: boolean;
          startup_cost_min_eur?: number | null;
          startup_cost_max_eur?: number | null;
          startup_cost_avg_eur?: number | null;
          startup_cost_median_eur?: number | null;
        };
        Relationships: [];
      };

      niches: {
        Row: {
          id: string;
          sector_id: string;
          code: string;
          name: string;
          description: string | null;
          config: Json;
          startup_cost_eur: number | null;
          roi_pct: number | null;
          payback_years: number | null;
          risk: string | null;
          capex: string | null;
          margin_pct_min: number | null;
          margin_pct_max: number | null;
          base_demand_index: number | null;
          ticket_level: string | null;
          competition: string | null;
          decision_profile: string | null;
          upgrade_profile: string | null;
          pricing_model: string | null;
          volume_baseline_week_min: number | null;
          volume_baseline_week_max: number | null;
          volume_unit: string | null;
          fixed_costs_month_min_eur: number | null;
          fixed_costs_month_max_eur: number | null;
          working_capital_days: Json | null;
          maintenance_pct_of_capex_per_year_min: number | null;
          maintenance_pct_of_capex_per_year_max: number | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          sector_id: string;
          code: string;
          name: string;
          description?: string | null;
          config: Json;
          startup_cost_eur?: number | null;
          roi_pct?: number | null;
          payback_years?: number | null;
          risk?: string | null;
          capex?: string | null;
          margin_pct_min?: number | null;
          margin_pct_max?: number | null;
          base_demand_index?: number | null;
          ticket_level?: string | null;
          competition?: string | null;
          decision_profile?: string | null;
          upgrade_profile?: string | null;
          pricing_model?: string | null;
          volume_baseline_week_min?: number | null;
          volume_baseline_week_max?: number | null;
          volume_unit?: string | null;
          fixed_costs_month_min_eur?: number | null;
          fixed_costs_month_max_eur?: number | null;
          working_capital_days?: Json | null;
          maintenance_pct_of_capex_per_year_min?: number | null;
          maintenance_pct_of_capex_per_year_max?: number | null;
          created_at?: string;
        };
        Update: {
          sector_id?: string;
          code?: string;
          name?: string;
          description?: string | null;
          config?: Json;
          startup_cost_eur?: number | null;
          roi_pct?: number | null;
          payback_years?: number | null;
          risk?: string | null;
          capex?: string | null;
          margin_pct_min?: number | null;
          margin_pct_max?: number | null;
          base_demand_index?: number | null;
          ticket_level?: string | null;
          competition?: string | null;
          decision_profile?: string | null;
          upgrade_profile?: string | null;
          pricing_model?: string | null;
          volume_baseline_week_min?: number | null;
          volume_baseline_week_max?: number | null;
          volume_unit?: string | null;
          fixed_costs_month_min_eur?: number | null;
          fixed_costs_month_max_eur?: number | null;
          working_capital_days?: Json | null;
          maintenance_pct_of_capex_per_year_min?: number | null;
          maintenance_pct_of_capex_per_year_max?: number | null;
        };
        Relationships: [
          {
            foreignKeyName: "niches_sector_id_fkey";
            columns: ["sector_id"];
            referencedRelation: "sectors";
            referencedColumns: ["id"];
          }
        ];
      };

      catalog_meta: {
        Row: {
          id: string;
          generated_at: string;
          assumptions: Json;
          upgrade_templates: Json;
        };
        Insert: {
          id?: string;
          generated_at: string;
          assumptions: Json;
          upgrade_templates: Json;
        };
        Update: {
          generated_at?: string;
          assumptions?: Json;
          upgrade_templates?: Json;
        };
        Relationships: [];
      };

      niche_products: {
        Row: {
          id: string;
          niche_id: string;
          sku: string;
          name: string;
          unit: string;
          price_min_eur: number;
          price_max_eur: number;
          cogs_pct_min: number;
          cogs_pct_max: number;
          capacity_driver: string;
          notes: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          niche_id: string;
          sku: string;
          name: string;
          unit: string;
          price_min_eur: number;
          price_max_eur: number;
          cogs_pct_min: number;
          cogs_pct_max: number;
          capacity_driver: string;
          notes: string;
          created_at?: string;
        };
        Update: {
          sku?: string;
          name?: string;
          unit?: string;
          price_min_eur?: number;
          price_max_eur?: number;
          cogs_pct_min?: number;
          cogs_pct_max?: number;
          capacity_driver?: string;
          notes?: string;
        };
        Relationships: [
          {
            foreignKeyName: "niche_products_niche_id_fkey";
            columns: ["niche_id"];
            referencedRelation: "niches";
            referencedColumns: ["id"];
          }
        ];
      };

      world_sector_state: {
        Row: {
          id: string;
          world_id: string;
          sector_id: string;
          current_demand: number;
          trend_factor: number;
          volatility: number;
          last_round_metrics: Json;
        };
        Insert: {
          id?: string;
          world_id: string;
          sector_id: string;
          current_demand?: number;
          trend_factor?: number;
          volatility?: number;
          last_round_metrics?: Json;
        };
        Update: {
          current_demand?: number;
          trend_factor?: number;
          volatility?: number;
          last_round_metrics?: Json;
        };
        Relationships: [
          {
            foreignKeyName: "world_sector_state_world_id_fkey";
            columns: ["world_id"];
            referencedRelation: "worlds";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "world_sector_state_sector_id_fkey";
            columns: ["sector_id"];
            referencedRelation: "sectors";
            referencedColumns: ["id"];
          }
        ];
      };

      /* =========================
       * COMPANIES
       * ========================= */
      companies: {
        Row: {
          id: string;
          holding_id: string;
          world_id: string;
          sector_id: string;
          niche_id: string;

          name: string;
          region: string;
          founded_year: number;
          status: string;

          created_at: string;
        };
        Insert: {
          id?: string;
          holding_id: string;
          world_id: string;
          sector_id: string;
          niche_id: string;

          name: string;
          region: string;
          founded_year: number;
          status?: string;

          created_at?: string;
        };
        Update: {
          holding_id?: string;
          world_id?: string;
          sector_id?: string;
          niche_id?: string;

          name?: string;
          region?: string;
          founded_year?: number;
          status?: string;
        };
        Relationships: [
          {
            foreignKeyName: "companies_holding_id_fkey";
            columns: ["holding_id"];
            referencedRelation: "holdings";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "companies_world_id_fkey";
            columns: ["world_id"];
            referencedRelation: "worlds";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "companies_sector_id_fkey";
            columns: ["sector_id"];
            referencedRelation: "sectors";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "companies_niche_id_fkey";
            columns: ["niche_id"];
            referencedRelation: "niches";
            referencedColumns: ["id"];
          }
        ];
      };

      company_state: {
        Row: {
          id: string;
          company_id: string;
          world_id: string;
          year: number;
          week: number;

          price_level: number;
          capacity: number;
          quality_score: number;
          marketing_level: number;
          awareness_score: number;
          employees: number;

          fixed_costs: number;
          variable_cost_per_unit: number;

          brand_score: number;
          operational_efficiency_score: number;
          utilisation_rate: number;
          warehouse_state: Json;

          created_at: string;
        };
        Insert: {
          id?: string;
          company_id: string;
          world_id: string;
          year: number;
          week: number;

          price_level?: number;
          capacity?: number;
          quality_score?: number;
          marketing_level?: number;
          awareness_score?: number;
          employees?: number;

          fixed_costs?: number;
          variable_cost_per_unit?: number;

          brand_score?: number;
          operational_efficiency_score?: number;
          utilisation_rate?: number;
          warehouse_state?: Json;

          created_at?: string;
        };
        Update: {
          price_level?: number;
          capacity?: number;
          quality_score?: number;
          marketing_level?: number;
          awareness_score?: number;
          employees?: number;

          fixed_costs?: number;
          variable_cost_per_unit?: number;

          brand_score?: number;
          operational_efficiency_score?: number;
          utilisation_rate?: number;
          warehouse_state?: Json;
        };
        Relationships: [
          {
            foreignKeyName: "company_state_company_id_fkey";
            columns: ["company_id"];
            referencedRelation: "companies";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "company_state_world_id_fkey";
            columns: ["world_id"];
            referencedRelation: "worlds";
            referencedColumns: ["id"];
          }
        ];
      };

      company_financials: {
        Row: {
          id: string;
          company_id: string;
          world_id: string;
          year: number;
          week: number;

          revenue: number;
          cogs: number;
          opex: number;
          interest_cost: number;
          tax_expense: number;

          net_profit: number;
          cash_change: number;

          assets: number;
          liabilities: number;
          equity: number;

          created_at: string;
        };
        Insert: {
          id?: string;
          company_id: string;
          world_id: string;
          year: number;
          week: number;

          revenue?: number;
          cogs?: number;
          opex?: number;
          interest_cost?: number;
          tax_expense?: number;

          net_profit?: number;
          cash_change?: number;

          assets?: number;
          liabilities?: number;
          equity?: number;

          created_at?: string;
        };
        Update: {
          revenue?: number;
          cogs?: number;
          opex?: number;
          interest_cost?: number;
          tax_expense?: number;
          net_profit?: number;
          cash_change?: number;
          assets?: number;
          liabilities?: number;
          equity?: number;
        };
        Relationships: [
          {
            foreignKeyName: "company_financials_company_id_fkey";
            columns: ["company_id"];
            referencedRelation: "companies";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "company_financials_world_id_fkey";
            columns: ["world_id"];
            referencedRelation: "worlds";
            referencedColumns: ["id"];
          }
        ];
      };

      /* =========================
       * DECISIONS
       * ========================= */
      company_decisions: {
        Row: {
          id: string;
          company_id: string;
          world_id: string;
          year: number;
          week: number;
          source: string;
          type: string;
          payload: Json;
          created_at: string;
        };
        Insert: {
          id?: string;
          company_id: string;
          world_id: string;
          year: number;
          week: number;
          source: string;
          type: string;
          payload: Json;
          created_at?: string;
        };
        Update: {
          source?: string;
          type?: string;
          payload?: Json;
        };
        Relationships: [
          {
            foreignKeyName: "company_decisions_company_id_fkey";
            columns: ["company_id"];
            referencedRelation: "companies";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "company_decisions_world_id_fkey";
            columns: ["world_id"];
            referencedRelation: "worlds";
            referencedColumns: ["id"];
          }
        ];
      };

      holding_decisions: {
        Row: {
          id: string;
          holding_id: string;
          world_id: string;
          year: number;
          week: number;
          source: string;
          type: string;
          payload: Json;
          created_at: string;
        };
        Insert: {
          id?: string;
          holding_id: string;
          world_id: string;
          year: number;
          week: number;
          source: string;
          type: string;
          payload: Json;
          created_at?: string;
        };
        Update: {
          source?: string;
          type?: string;
          payload?: Json;
        };
        Relationships: [
          {
            foreignKeyName: "holding_decisions_holding_id_fkey";
            columns: ["holding_id"];
            referencedRelation: "holdings";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "holding_decisions_world_id_fkey";
            columns: ["world_id"];
            referencedRelation: "worlds";
            referencedColumns: ["id"];
          }
        ];
      };

      acquisition_offers: {
        Row: {
          id: string;
          world_id: string;
          company_id: string;
          buyer_holding_id: string;
          seller_holding_id: string;
          status: string;
          offer_price: number;
          currency: string;
          message: string | null;
          turn: string;
          last_action: string;
          counter_count: number;
          expires_year: number | null;
          expires_week: number | null;
          history: Json;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          world_id: string;
          company_id: string;
          buyer_holding_id: string;
          seller_holding_id: string;
          status?: string;
          offer_price: number;
          currency?: string;
          message?: string | null;
          turn?: string;
          last_action?: string;
          counter_count?: number;
          expires_year?: number | null;
          expires_week?: number | null;
          history?: Json;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          status?: string;
          offer_price?: number;
          currency?: string;
          message?: string | null;
          turn?: string;
          last_action?: string;
          counter_count?: number;
          expires_year?: number | null;
          expires_week?: number | null;
          history?: Json;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "acquisition_offers_world_id_fkey";
            columns: ["world_id"];
            referencedRelation: "worlds";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "acquisition_offers_company_id_fkey";
            columns: ["company_id"];
            referencedRelation: "companies";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "acquisition_offers_buyer_holding_id_fkey";
            columns: ["buyer_holding_id"];
            referencedRelation: "holdings";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "acquisition_offers_seller_holding_id_fkey";
            columns: ["seller_holding_id"];
            referencedRelation: "holdings";
            referencedColumns: ["id"];
          }
        ];
      };

      /* =========================
       * PROGRAMS & UPGRADES
       * ========================= */
      company_programs: {
        Row: {
          id: string;
          company_id: string;
          world_id: string;
          program_type: string;
          payload: Json;
          start_year: number;
          start_week: number;
          duration_weeks: number;
          status: string;
          created_at: string;
          cancelled_at: string | null;
        };
        Insert: {
          id?: string;
          company_id: string;
          world_id: string;
          program_type: string;
          payload?: Json;
          start_year: number;
          start_week: number;
          duration_weeks?: number;
          status?: string;
          created_at?: string;
          cancelled_at?: string | null;
        };
        Update: {
          program_type?: string;
          payload?: Json;
          duration_weeks?: number;
          status?: string;
          cancelled_at?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "company_programs_company_id_fkey";
            columns: ["company_id"];
            referencedRelation: "companies";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "company_programs_world_id_fkey";
            columns: ["world_id"];
            referencedRelation: "worlds";
            referencedColumns: ["id"];
          }
        ];
      };

      niche_upgrades: {
        Row: {
          id: string;
          niche_id: string;
          code: string;
          tree_key: string;
          name: string;
          description: string | null;
          tier: number;
          cost: number;
          duration_weeks: number;
          effects: Json;
          capex_pct_min: number | null;
          capex_pct_max: number | null;
          opex_pct_min: number | null;
          opex_pct_max: number | null;
          capex_formula: string | null;
          opex_formula: string | null;
          delay_weeks_min: number | null;
          delay_weeks_max: number | null;
          risk: Json | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          niche_id: string;
          code: string;
          tree_key: string;
          name: string;
          description?: string | null;
          tier?: number;
          cost?: number;
          duration_weeks?: number;
          effects?: Json;
          capex_pct_min?: number | null;
          capex_pct_max?: number | null;
          opex_pct_min?: number | null;
          opex_pct_max?: number | null;
          capex_formula?: string | null;
          opex_formula?: string | null;
          delay_weeks_min?: number | null;
          delay_weeks_max?: number | null;
          risk?: Json | null;
          created_at?: string;
        };
        Update: {
          code?: string;
          tree_key?: string;
          name?: string;
          description?: string | null;
          tier?: number;
          cost?: number;
          duration_weeks?: number;
          effects?: Json;
          capex_pct_min?: number | null;
          capex_pct_max?: number | null;
          opex_pct_min?: number | null;
          opex_pct_max?: number | null;
          capex_formula?: string | null;
          opex_formula?: string | null;
          delay_weeks_min?: number | null;
          delay_weeks_max?: number | null;
          risk?: Json | null;
        };
        Relationships: [
          {
            foreignKeyName: "niche_upgrades_niche_id_fkey";
            columns: ["niche_id"];
            referencedRelation: "niches";
            referencedColumns: ["id"];
          }
        ];
      };

      company_upgrades: {
        Row: {
          id: string;
          company_id: string;
          world_id: string;
          upgrade_id: string;
          purchased_year: number;
          purchased_week: number;
          status: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          company_id: string;
          world_id: string;
          upgrade_id: string;
          purchased_year: number;
          purchased_week: number;
          status?: string;
          created_at?: string;
        };
        Update: {
          status?: string;
        };
        Relationships: [
          {
            foreignKeyName: "company_upgrades_company_id_fkey";
            columns: ["company_id"];
            referencedRelation: "companies";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "company_upgrades_world_id_fkey";
            columns: ["world_id"];
            referencedRelation: "worlds";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "company_upgrades_upgrade_id_fkey";
            columns: ["upgrade_id"];
            referencedRelation: "niche_upgrades";
            referencedColumns: ["id"];
          }
        ];
      };

      /* =========================
       * FINANCE
       * ========================= */
      loans: {
        Row: {
          id: string;
          world_id: string;
          holding_id: string | null;
          company_id: string | null;

          principal: number;
          outstanding_balance: number;
          interest_rate: number;

          term_weeks: number;
          remaining_weeks: number;

          lender_name: string;
          type: string;
          status: string;

          created_at: string;
        };
        Insert: {
          id?: string;
          world_id: string;
          holding_id?: string | null;
          company_id?: string | null;

          principal: number;
          outstanding_balance: number;
          interest_rate: number;

          term_weeks: number;
          remaining_weeks: number;

          lender_name: string;
          type: string;
          status?: string;

          created_at?: string;
        };
        Update: {
          outstanding_balance?: number;
          interest_rate?: number;
          remaining_weeks?: number;
          status?: string;

          // ✅ fix voor jouw error: property bestaat nu
          lender_name?: string;

          // optioneel editbaar
          principal?: number;
          term_weeks?: number;
          type?: string;
          holding_id?: string | null;
          company_id?: string | null;
          world_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "loans_world_id_fkey";
            columns: ["world_id"];
            referencedRelation: "worlds";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "loans_holding_id_fkey";
            columns: ["holding_id"];
            referencedRelation: "holdings";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "loans_company_id_fkey";
            columns: ["company_id"];
            referencedRelation: "companies";
            referencedColumns: ["id"];
          }
        ];
      };

      properties: {
        Row: {
          id: string;
          world_id: string;
          holding_id: string | null;
          company_id: string | null;

          type: string;
          location: string;
          purchase_price: number;
          market_value: number;

          rental_income_week: number;
          maintenance_cost_week: number;

          created_at: string;
        };
        Insert: {
          id?: string;
          world_id: string;
          holding_id?: string | null;
          company_id?: string | null;

          type: string;
          location: string;
          purchase_price: number;
          market_value: number;

          rental_income_week?: number;
          maintenance_cost_week?: number;

          created_at?: string;
        };
        Update: {
          market_value?: number;
          rental_income_week?: number;
          maintenance_cost_week?: number;
        };
        Relationships: [
          {
            foreignKeyName: "properties_world_id_fkey";
            columns: ["world_id"];
            referencedRelation: "worlds";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "properties_holding_id_fkey";
            columns: ["holding_id"];
            referencedRelation: "holdings";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "properties_company_id_fkey";
            columns: ["company_id"];
            referencedRelation: "companies";
            referencedColumns: ["id"];
          }
        ];
      };

      investments: {
        Row: {
          id: string;
          world_id: string;
          holding_id: string;

          type: string;
          name: string;

          current_value: number;
          cost_basis: number;

          meta: Json;
          created_at: string;
        };
        Insert: {
          id?: string;
          world_id: string;
          holding_id: string;

          type: string;
          name: string;

          current_value: number;
          cost_basis: number;

          meta?: Json;
          created_at?: string;
        };
        Update: {
          current_value?: number;
          meta?: Json;
        };
        Relationships: [
          {
            foreignKeyName: "investments_world_id_fkey";
            columns: ["world_id"];
            referencedRelation: "worlds";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "investments_holding_id_fkey";
            columns: ["holding_id"];
            referencedRelation: "holdings";
            referencedColumns: ["id"];
          }
        ];
      };

      /* =========================
       * EVENTS
       * ========================= */
      events: {
        Row: {
          id: string;
          world_id: string;
          sector_id: string | null;
          company_id: string | null;
          holding_id: string | null;

          scope: string;
          type: string;
          severity: number;
          payload: Json;

          year: number;
          week: number;

          created_at: string;
        };
        Insert: {
          id?: string;
          world_id: string;
          sector_id?: string | null;
          company_id?: string | null;
          holding_id?: string | null;

          scope: string;
          type: string;
          severity?: number;
          payload?: Json;

          year: number;
          week: number;

          created_at?: string;
        };
        Update: never;
        Relationships: [
          {
            foreignKeyName: "events_world_id_fkey";
            columns: ["world_id"];
            referencedRelation: "worlds";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "events_sector_id_fkey";
            columns: ["sector_id"];
            referencedRelation: "sectors";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "events_company_id_fkey";
            columns: ["company_id"];
            referencedRelation: "companies";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "events_holding_id_fkey";
            columns: ["holding_id"];
            referencedRelation: "holdings";
            referencedColumns: ["id"];
          }
        ];
      };

      /* =========================
       * BOTS
       * ========================= */
      bot_profiles: {
        Row: {
          id: string;
          name: string;
          archetype: string;
          behavior_config: Json;
          created_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          archetype: string;
          behavior_config: Json;
          created_at?: string;
        };
        Update: {
          name?: string;
          archetype?: string;
          behavior_config?: Json;
        };
        Relationships: [];
      };

      bots: {
        Row: {
          id: string;
          world_id: string;
          bot_profile_id: string;
          holding_id: string;
          active: boolean;
          created_at: string;
        };
        Insert: {
          id?: string;
          world_id: string;
          bot_profile_id: string;
          holding_id: string;
          active?: boolean;
          created_at?: string;
        };
        Update: {
          active?: boolean;
        };
        Relationships: [
          {
            foreignKeyName: "bots_world_id_fkey";
            columns: ["world_id"];
            referencedRelation: "worlds";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "bots_bot_profile_id_fkey";
            columns: ["bot_profile_id"];
            referencedRelation: "bot_profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "bots_holding_id_fkey";
            columns: ["holding_id"];
            referencedRelation: "holdings";
            referencedColumns: ["id"];
          }
        ];
      };

      /* =========================
       * PROGRESSION
       * ========================= */
      skills: {
        Row: {
          id: string;
          tree: string;
          name: string;
          description: string | null;
          tier: number;
          effects: Json;
          created_at: string;
        };
        Insert: {
          id?: string;
          tree: string;
          name: string;
          description?: string | null;
          tier: number;
          effects: Json;
          created_at?: string;
        };
        Update: {
          tree?: string;
          name?: string;
          description?: string | null;
          tier?: number;
          effects?: Json;
        };
        Relationships: [];
      };

      player_skills: {
        Row: {
          id: string;
          player_id: string;
          skill_id: string;
          unlocked_at: string;
        };
        Insert: {
          id?: string;
          player_id: string;
          skill_id: string;
          unlocked_at?: string;
        };
        Update: never;
        Relationships: [
          {
            foreignKeyName: "player_skills_player_id_fkey";
            columns: ["player_id"];
            referencedRelation: "players";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "player_skills_skill_id_fkey";
            columns: ["skill_id"];
            referencedRelation: "skills";
            referencedColumns: ["id"];
          }
        ];
      };

      achievements: {
        Row: {
          id: string;
          name: string;
          description: string | null;
          conditions: Json;
          created_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          description?: string | null;
          conditions: Json;
          created_at?: string;
        };
        Update: {
          name?: string;
          description?: string | null;
          conditions?: Json;
        };
        Relationships: [];
      };

      player_achievements: {
        Row: {
          id: string;
          player_id: string;
          achievement_id: string;
          unlocked_at: string;
        };
        Insert: {
          id?: string;
          player_id: string;
          achievement_id: string;
          unlocked_at?: string;
        };
        Update: never;
        Relationships: [
          {
            foreignKeyName: "player_achievements_player_id_fkey";
            columns: ["player_id"];
            referencedRelation: "players";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "player_achievements_achievement_id_fkey";
            columns: ["achievement_id"];
            referencedRelation: "achievements";
            referencedColumns: ["id"];
          }
        ];
      };
    };

    Views: {};

    Functions: {
      set_updated_at: {
        Args: Record<string, never>;
        Returns: unknown;
      };
    };

    Enums: {};
    CompositeTypes: {};
  };
};
