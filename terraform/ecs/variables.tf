variable "region" {
  type = string
}

variable "app_name" {
  type = string
}

variable "environment" {
  type = string
}

variable "image" {
  type = string
}

variable "image_version" {
  type = string
}

variable "vpc_id" {
  type = string
}

variable "vpc_cidr" {
  type = string
}

variable "route53_zone_id" {
  type = string
}

variable "fqdn" {
  type = string
}

variable "acm_certificate_arn" {
  type = string
}

variable "public_subnets" {
  type = set(string)
}

variable "private_subnets" {
  type = set(string)
}

variable "cpu" {
  type = number
}

variable "memory" {
  type = number
}

variable "desired_count" {
  type = number
}

variable "autoscaling_max_capacity" {
  type = number
}

variable "autoscaling_min_capacity" {
  type = number
}

variable "node_env" {
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
