// Generate a random string for redis auth token, no special chars
resource "random_string" "redis_auth_token" {
  length  = 64
  special = false
}
