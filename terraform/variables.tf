variable "region" {
  type    = string
  default = "eu-central-1"
}

variable "azs" {
  type    = list(string)
  default = ["eu-central-1a", "eu-central-1b", "eu-central-1c"]
}

variable "public_url" {
  type    = string
  default = "cloud-auth-api.walletconnect.com"
}

variable "image_version" {
  type    = string
  default = ""
}

variable "cloud_app_origin" {
  type = string
}

variable "database_url" {
  type = string
  sensitive = true
}

variable "direct_url" {
  type = string
  sensitive = true
}

variable "cookie_name" {
  type = string
}

variable "cookie_secret" {
  type = string
  sensitive = true
}

variable "supabase_jwt_secret" {
  type = string
  sensitive = true
}
