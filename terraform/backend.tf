# Terraform Configuration
terraform {
  required_version = "~> 1.0"
  required_providers {
    assert = {
      source = "bwoznicki/assert"
    }
    aws = {
      source  = "hashicorp/aws"
      version = "~> 4.31"
    }
    github = {
      source  = "integrations/github"
      version = "5.7.0"
    }
  }

  backend "s3" {
    region               = "eu-central-1"
    bucket               = "opz"
    workspace_key_prefix = "infra/env"
    key                  = "apps/cloud-auth-api.tfstate"

    force_path_style = true
  }
}
