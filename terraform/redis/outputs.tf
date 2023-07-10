output "cluster_id" {
  value = aws_elasticache_cluster.cache.cache_nodes.0.address
}

output "redis_auth_token" {
  value = random_string.redis_auth_token.result
}
