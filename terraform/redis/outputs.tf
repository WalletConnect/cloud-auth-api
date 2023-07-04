output "cluster_id" {
  value = aws_elasticache_cluster.cache.cache_nodes.0.address
}
