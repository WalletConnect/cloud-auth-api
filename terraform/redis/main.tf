resource "aws_elasticache_subnet_group" "private_subnets" {
  name       = replace("${var.app_name}-${var.redis_name}-private-subnet-group", "_", "-")
  subnet_ids = var.private_subnet_ids
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

resource "aws_elasticache_cluster" "cache" {
  cluster_id                 = replace("${var.app_name}-${var.redis_name}", "_", "-")
  engine                     = "redis"
  node_type                  = var.node_type
  num_cache_nodes            = 1
  parameter_group_name       = "default.redis6.x"
  engine_version             = "6.x"
  port                       = 6379
  subnet_group_name          = aws_elasticache_subnet_group.private_subnets.name
  transit_encryption_enabled = true
  security_group_ids = [
    aws_security_group.service_security_group.id
  ]
}


