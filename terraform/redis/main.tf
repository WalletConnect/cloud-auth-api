resource "aws_elasticache_cluster" "cache" {
  cluster_id           = replace("${var.app_name}-${var.redis_name}", "_", "-")
  engine               = "redis"
  node_type            = var.node_type
  num_cache_nodes      = 1
  parameter_group_name = "default.redis6.x"
  engine_version       = "6.x"
  port                 = 6379
  subnet_group_name    = aws_elasticache_subnet_group.private_subnets.name
  security_group_ids = [
    aws_security_group.service_security_group.id
  ]
}

resource "aws_elasticache_subnet_group" "private_subnets" {
  name       = replace("${var.app_name}-${var.redis_name}-private-subnet-group", "_", "-")
  subnet_ids = data.aws_subnets.private_subnets.ids
}

# Allow only the app to access Redis
resource "aws_security_group" "service_security_group" {
  name        = "${var.app_name}-${var.redis_name}-redis-service-ingress"
  description = "Allow ingress from the application"
  vpc_id      = var.vpc_id
  ingress {
    from_port   = 6379
    to_port     = 6379
    protocol    = "TCP"
    cidr_blocks = var.allowed_ingress_cidr_blocks
  }

  egress {
    from_port   = 0             # Allowing any incoming port
    to_port     = 0             # Allowing any outgoing port
    protocol    = "-1"          # Allowing any outgoing protocol
    cidr_blocks = ["0.0.0.0/0"] # Allowing traffic out to all IP addresses
  }
}

# DNS
resource "aws_route53_zone" "private_zone" {
  name = (
    terraform.workspace == "prod" ?
    replace("redis-cloud-auth-api.${var.redis_name}.internal", "_", "-") :
    replace("${terraform.workspace}.${var.redis_name}.redis-cloud-auth-api.internal", "_", "-")
  )

  vpc {
    vpc_id = var.vpc_id
  }

  lifecycle {
    ignore_changes = [vpc]
  }
}

resource "aws_route53_record" "dns" {
  zone_id = aws_route53_zone.private_zone.id
  name    = "${replace("${var.redis_name}-redis", "_", "-")}.${aws_route53_zone.private_zone.name}"
  type    = "CNAME"
  ttl     = "30"
  records = [for cache_node in aws_elasticache_cluster.cache.cache_nodes : cache_node.address]
}
