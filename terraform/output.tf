output "server_elastic_ip" {
  description = "Elastic IP address of the campus interview server"
  value       = aws_eip.campus_eip.public_ip
}