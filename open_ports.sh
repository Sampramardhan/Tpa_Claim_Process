#!/bin/bash
set -e

echo "Installing AWS CLI..."
sudo apt-get install -y awscli

echo "Adding inbound rule for port 5173..."
aws ec2 authorize-security-group-ingress \
  --group-id sg-0954a8cffeddaca86 \
  --protocol tcp \
  --port 5173 \
  --cidr 0.0.0.0/0 \
  --region us-east-2

echo "Adding inbound rule for port 8080..."
aws ec2 authorize-security-group-ingress \
  --group-id sg-0954a8cffeddaca86 \
  --protocol tcp \
  --port 8080 \
  --cidr 0.0.0.0/0 \
  --region us-east-2

echo "Done! Testing access..."
curl -s -o /dev/null -w "Frontend (5173): HTTP %{http_code}\n" --connect-timeout 5 http://3.131.93.92:5173 || echo "Frontend still blocked"
curl -s -o /dev/null -w "Backend  (8080): HTTP %{http_code}\n" --connect-timeout 5 http://3.131.93.92:8080 || echo "Backend still blocked"
