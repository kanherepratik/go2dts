/** 
 * Generated by go2dts
 *
 * Source: bundle.go
 **/

export type Time = string

export type UUID = string

export interface RegisterBundleRequest {
  name: string
  gitUrl: string
  branch: string
  tenantId: string
  realmId: string
}

export interface PatchBundleRequest {
  name?: string
  gitUrl?: string
  branch?: string
  coverImageURL?: string
  tags: string[]
}

export interface BundleResponse {
  id: UUID
  createdAt: Time
  updatedAt: Time
  syncedAt: Time | null
  deployedAt: Time | null
  deployedSHA: string
  name: string
  gitUrl: string
  gitSHA: string
  branch: string
  config: types.Bundle
  publicKey: string
  coverImageURL: string
  tags: string[]
  tenantId: string
  realmId: string
  activeDeployID: UUID | null
  topContributors: Contributor[]
  description: string
}

export interface BundleListResponse {
  page: PageMeta
  data?: BundleResponse[]
}

export interface DeployResponse {
  bundle: BundleResponse
  functions?: FunctionResponse[]
}

export interface DeployLog {
  id: UUID
  createdAt: Time
  bundleId: UUID
  deployId: UUID
  gitUrl: string
  sha: string
  message: string
  status: string
}

export interface DeployLogResponse {
  page: PageMeta
  data: DeployLog[]
}

export interface ContributorListResponse {
  page: PageMeta
  data?: Contributor[]
}

export interface BundleEditStartResponse {
  url: string
}

export interface BundleSyncResponse {
  sha: string
  branch: string
  gitURL: string
  updated: boolean
}

