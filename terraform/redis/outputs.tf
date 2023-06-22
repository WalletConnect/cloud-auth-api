output "endpoint" {
  value = aws_route53_record.dns.fqdn
}

output "hosted_zone_id" {
  value = aws_route53_zone.private_zone.id
}

output "cluster_id" {
  value = aws_elasticache_cluster.cache.id
}
