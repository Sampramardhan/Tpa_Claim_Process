#!/bin/bash
set -e

echo "Updating apt..."
sudo apt-get update

echo "Installing prerequisites..."
sudo apt-get install -y ca-certificates curl

echo "Adding Docker GPG key..."
sudo install -m 0755 -d /etc/apt/keyrings
sudo curl -fsSL https://download.docker.com/linux/ubuntu/gpg -o /etc/apt/keyrings/docker.asc
sudo chmod a+r /etc/apt/keyrings/docker.asc

echo "Adding Docker repository..."
echo "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.asc] https://download.docker.com/linux/ubuntu $(. /etc/os-release && echo "$VERSION_CODENAME") stable" | sudo tee /etc/apt/sources.list.d/docker.list > /dev/null

echo "Fixing any broken packages..."
sudo apt-get --fix-broken install -y
sudo dpkg --remove docker-compose docker-compose-v2 || true

echo "Installing Docker..."
sudo apt-get update
sudo apt-get install -y docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin

echo "Preparing project directory..."
mkdir -p ~/project
cd ~/project

echo "Extracting project..."
tar -xf ~/project.tar.gz -C .

echo "Building and starting containers..."
sudo docker compose up -d --build

echo "Deployment complete."
sudo docker ps
