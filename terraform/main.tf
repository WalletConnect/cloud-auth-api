locals {
  app_name    = "cloud-auth"
  environment = terraform.workspace

  fqdn = local.environment == "prod" ? var.public_url : "${local.environment}.${var.public_url}"

  latest_release_name = data.github_release.latest_release.name
  version             = coalesce(var.image_version, substr(local.latest_release_name, 1, length(local.latest_release_name)))
}

#tflint-ignore: terraform_required_providers,terraform_unused_declarations
data "assert_test" "workspace" {
  test  = terraform.workspace != "default"
  throw = "default workspace is not valid in this project"
}

data "github_release" "latest_release" {
  repository  = "cloud-auth-api"
  owner       = "walletconnect"
  retrieve_by = "latest"
}

module "vpc" {
  source  = "terraform-aws-modules/vpc/aws"
  version = "3.19.0"

  name = "${local.environment}-${local.app_name}"

  cidr = "10.0.0.0/16"

  azs             = var.azs
  private_subnets = ["10.0.1.0/24", "10.0.2.0/24", "10.0.3.0/24"]
  public_subnets  = ["10.0.4.0/24", "10.0.5.0/24", "10.0.6.0/24"]

  private_subnet_tags = {
    Visibility = "private"
  }
  public_subnet_tags = {
    Visibility = "public"
  }

  enable_dns_support     = true
  enable_dns_hostnames   = true
  enable_nat_gateway     = true
  single_nat_gateway     = true
  one_nat_gateway_per_az = false
}

module "tags" {
  source = "github.com/WalletConnect/terraform-modules.git?ref=52a74ee5bcaf5cacb5664c6f88d9dbce28500581//modules/tags"

  application = local.app_name
  env         = local.environment
}

module "dns" {
  source = "github.com/WalletConnect/terraform-modules.git?ref=52a74ee5bcaf5cacb5664c6f88d9dbce28500581//modules/dns"

  hosted_zone_name = var.public_url
  fqdn             = local.fqdn
}

module "ecs" {
  source = "./ecs"

  app_name               = "${local.environment}-${local.app_name}"
  environment            = local.environment
  prometheus_endpoint    = aws_prometheus_workspace.prometheus.prometheus_endpoint
  image                  = "${data.aws_ecr_repository.repository.repository_url}:${local.version}"
  image_version          = local.version
  acm_certificate_arn    = module.dns.certificate_arn
  cpu                    = 512
  fqdn                   = local.fqdn
  memory                 = 1024
  cloud_app_origin = var.cloud_app_origin
  private_subnets        = module.vpc.private_subnets
  public_subnets         = module.vpc.public_subnets
  region                 = var.region
  route53_zone_id        = module.dns.zone_id
  vpc_cidr               = module.vpc.vpc_cidr_block
  vpc_id                 = module.vpc.vpc_id

  autoscaling_max_capacity = local.environment == "prod" ? 4 : 1
  autoscaling_min_capacity = local.environment == "prod" ? 2 : 1
  desired_count            = local.environment == "prod" ? 2 : 1
}

data "aws_ecr_repository" "repository" {
  name = "cloud-auth-api"
}
