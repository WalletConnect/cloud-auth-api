variable "redis_name" {
  type = string
}

variable "node_type" {
  type = string
}

variable "app_name" {
  type = string
}

variable "allowed_ingress_cidr_blocks" {
  type = list(string)
}

variable "private_subnet_ids" {
  type = list(string)
}

variable "vpc_id" {
  type = string
}
