#!/bin/bash

# Color Definitions
COLOR_GREEN='\033[0;32m'
COLOR_RED='\033[0;31m'
COLOR_BLUE='\033[0;34m'
COLOR_NC='\033[0m' # No Color

echo -e "${COLOR_BLUE}🚀 Starting the Ultimate Weekly Task Manager Setup... ${COLOR_NC}"

# Check for Docker
if ! command -v docker &> /dev/null
then
    echo -e "${COLOR_RED}✖ Docker could not be found. Please install Docker to continue.${COLOR_NC}"
    exit 1
fi
if ! command -v docker-compose &> /dev/null
then
   # Fallback for newer Docker versions where compose is a plugin
   if ! docker compose version &> /dev/null; then
     echo -e "${COLOR_RED}✖ Docker Compose could not be found. Please install it to continue.${COLOR_NC}"
     exit 1
   fi
   DOCKER_COMPOSE_CMD="docker compose"
else
   DOCKER_COMPOSE_CMD="docker-compose"
fi

echo -e "${COLOR_GREEN}✔ Docker and Docker Compose found.${COLOR_NC}"

# Generate .env file
if [ -f .env ]; then
    echo -e "${COLOR_BLUE}ℹ .env file already exists. Skipping creation.${COLOR_NC}"
else
    echo -e "${COLOR_BLUE}ℹ Generating .env file... ${COLOR_NC}"
    JWT_SECRET=$(openssl rand -hex 32)
    
    cat > .env << EOL
# Environment variables for the application
JWT_SECRET=${JWT_SECRET}
DEFAULT_ADMIN_PASSWORD=Poppy1234
EOL
    echo -e "${COLOR_GREEN}✔ .env file created successfully.${COLOR_NC}"
fi

# Build and run Docker containers
echo -e "${COLOR_BLUE}ℹ Building and starting containers... This may take a few minutes.${COLOR_NC}"
$DOCKER_COMPOSE_CMD up --build -d

if [ $? -eq 0 ]; then
    echo
    echo -e "${COLOR_GREEN}🎉 Success! Your Weekly Task Manager is up and running!${COLOR_NC}"
    echo
    echo -e "You can access it at: \033[0;34mhttp://localhost\033[0m"
    echo -e "Admin username: \033[0;34mwillem\033[0m"
    echo -e "Admin password: \033[0;34m(the one you entered during setup)\033[0m"
    echo
    echo -e "To stop the application, run: \033[0;34m$DOCKER_COMPOSE_CMD down${COLOR_NC}"
else
    echo -e "${COLOR_RED}✖ An error occurred during docker-compose up. Please check the output above for details.${COLOR_NC}"
fi

