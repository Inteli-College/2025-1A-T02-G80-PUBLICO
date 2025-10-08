import { sql } from '../database/config';
import { UserProfile, UserProfileUpdate } from '../models/UserProfile';

/**
 * Repository para gerenciar perfis de usuários no banco de dados
 */
export class UserProfileRepository {
  /**
   * Busca ou cria um perfil de usuário
   */
  async findOrCreateProfile(whatsappNumber: string): Promise<UserProfile> {
    try {
      // Tentar buscar perfil existente
      const result = await sql`
        SELECT * FROM user_profiles
        WHERE whatsapp_number = ${whatsappNumber}
        LIMIT 1
      `;

      if (result.length > 0) {
        return this.mapToUserProfile(result[0]);
      }

      // Se não existe, criar novo perfil
      const userId = `user_${whatsappNumber}_${Date.now()}`;
      const newProfile = await sql`
        INSERT INTO user_profiles (user_id, whatsapp_number, profile_step)
        VALUES (${userId}, ${whatsappNumber}, 0)
        RETURNING *
      `;

      return this.mapToUserProfile(newProfile[0]);
    } catch (error) {
      console.error('Erro ao buscar/criar perfil:', error);
      throw error;
    }
  }

  /**
   * Atualiza o perfil do usuário
   */
  async updateProfile(
    whatsappNumber: string, 
    updates: UserProfileUpdate
  ): Promise<UserProfile> {
    try {
      // Buscar perfil atual
      const currentProfile = await this.findByWhatsappNumber(whatsappNumber);
      if (!currentProfile) {
        throw new Error('Perfil não encontrado');
      }

      // Merge dos dados
      const updatedData = {
        profile_step: updates.profile_step ?? currentProfile.profile_step,
        age: updates.age ?? currentProfile.age,
        risk_tolerance: updates.risk_tolerance ?? currentProfile.risk_tolerance,
        goals: updates.goals ?? currentProfile.goals,
        income_range: updates.income_range ?? currentProfile.income_range,
        experience_level: updates.experience_level ?? currentProfile.experience_level,
        completed_at: updates.completed_at ?? currentProfile.completed_at
      };

      // Atualizar no banco
      const result = await sql`
        UPDATE user_profiles
        SET 
          profile_step = ${updatedData.profile_step},
          age = ${updatedData.age},
          risk_tolerance = ${updatedData.risk_tolerance},
          goals = ${updatedData.goals ? JSON.stringify(updatedData.goals) : null}::jsonb,
          income_range = ${updatedData.income_range},
          experience_level = ${updatedData.experience_level},
          completed_at = ${updatedData.completed_at},
          updated_at = NOW()
        WHERE whatsapp_number = ${whatsappNumber}
        RETURNING *
      `;
      
      if (result.length === 0) {
        throw new Error('Falha ao atualizar perfil');
      }

      return this.mapToUserProfile(result[0]);
    } catch (error) {
      console.error('Erro ao atualizar perfil:', error);
      throw error;
    }
  }

  /**
   * Busca perfil por número do WhatsApp
   */
  async findByWhatsappNumber(whatsappNumber: string): Promise<UserProfile | null> {
    try {
      const result = await sql`
        SELECT * FROM user_profiles
        WHERE whatsapp_number = ${whatsappNumber}
        LIMIT 1
      `;

      if (result.length === 0) {
        return null;
      }

      return this.mapToUserProfile(result[0]);
    } catch (error) {
      console.error('Erro ao buscar perfil:', error);
      throw error;
    }
  }

  /**
   * Verifica se o perfil está completo
   */
  async isProfileComplete(whatsappNumber: string): Promise<boolean> {
    try {
      const profile = await this.findByWhatsappNumber(whatsappNumber);
      return profile ? profile.profile_step >= 6 : false;
    } catch (error) {
      console.error('Erro ao verificar perfil completo:', error);
      return false;
    }
  }

  /**
   * Mapeia resultado do banco para interface UserProfile
   */
  private mapToUserProfile(row: any): UserProfile {
    return {
      user_id: row.user_id,
      whatsapp_number: row.whatsapp_number,
      profile_step: row.profile_step || 0,
      age: row.age,
      risk_tolerance: row.risk_tolerance,
      goals: row.goals ? (typeof row.goals === 'string' ? JSON.parse(row.goals) : row.goals) : undefined,
      income_range: row.income_range,
      experience_level: row.experience_level,
      created_at: row.created_at,
      updated_at: row.updated_at,
      completed_at: row.completed_at
    };
  }
}

export default new UserProfileRepository();
