resource "aws_security_group" "campus_sg" {
  name        = "campus-interview-sg"
  description = "Security group for PCCOE Campus Interview Platform"

  # SSH
  ingress {
    description = "SSH"
    from_port   = 22
    to_port     = 22
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
  }

  # HTTP
  ingress {
    description = "HTTP"
    from_port   = 80
    to_port     = 80
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
  }

  # Node.js application
  ingress {
    description = "Node.js Application"
    from_port   = 5000
    to_port     = 5000
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
  }

  # Allow server to access the internet
  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }

  tags = {
    Name = "campus-interview-sg"
  }
}

resource "aws_instance" "campus_server" {
  ami           = "ami-01a00762f46d584a1"
  instance_type = "t3.micro"

  key_name = "keypair"

  vpc_security_group_ids = [
    aws_security_group.campus_sg.id
  ]

  tags = {
    Name = "PCCOE-Campus-Interview-Server"
  }
}

resource "aws_eip" "campus_eip" {
  instance = aws_instance.campus_server.id

  tags = {
    Name = "PCCOE-Campus-Elastic-IP"
  }
}