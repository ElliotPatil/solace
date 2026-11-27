export interface BaseRecord {
  id: string
  createdAt: string
  updatedAt: string
}

export type SkillCategory = 'technology' | 'creative' | 'business' | 'communication' | 'academic' | 'other'
export type HobbyCategory = 'sports' | 'music' | 'creative' | 'learning' | 'entertainment' | 'other'

export interface MediaAssetReference {
  id: string
  mimeType: string
  fileName: string
  size: number
  storagePath?: string
}

export interface Skill extends BaseRecord {
  name: string
  description: string
  category: SkillCategory
  banner?: MediaAssetReference
  showcaseImages: MediaAssetReference[]
  startedAt?: string
  tags: string[]
  personalNotes?: string
  relatedHobbyIds: string[]
  relatedSkillIds: string[]
  isPinned: boolean
  archived: boolean
}

export interface Hobby extends BaseRecord {
  name: string
  description: string
  category: HobbyCategory
  banner?: MediaAssetReference
  showcaseImages: MediaAssetReference[]
  startedAt?: string
  tags: string[]
  personalNotes?: string
  relatedSkillIds: string[]
  isPinned: boolean
  archived: boolean
}

export type InterestType = 'skill' | 'hobby'
export interface InterestReference {
  type: InterestType
  id: string
}

export interface InterestConnection extends BaseRecord {
  source: InterestReference
  target: InterestReference
  connectionType: 'shared_interest' | 'complementary' | 'related'
  sourceOfConnection: 'manual' | 'tag_overlap' | 'shared_category'
  explanation?: string
  confidence?: number
}

export interface InterestInsight {
  id: string
  type: 'common_ground' | 'recurring_theme' | 'skill_hobby_overlap' | 'interest_cluster'
  title: string
  description: string
  relatedItems: InterestReference[]
  generatedAt: string
}
