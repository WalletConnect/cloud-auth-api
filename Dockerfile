# Build stage
FROM node:16.17.0-bullseye-slim as build

# Set the working directory inside the container
WORKDIR /app

ENV NODE_ENV development
# Copy package.json and package-lock.json to the working directory
COPY package*.json ./

# Install dev dependencies
RUN npm ci --only-dev --ignore-scripts

# Copy the rest of the application code to the working directory
COPY . .

# Compile TypeScript
RUN npm run build

# Production stage
FROM node:16.17.0-bullseye-slim as production

# Set the working directory inside the container
WORKDIR /app

# install dumb-init
RUN apt-get update && apt-get install -y --no-install-recommends dumb-init

# Set node env to prod
ENV NODE_ENV production

# Copy package.json and package-lock.json to the working directory
COPY package*.json ./

# Install prod dependencies
RUN npm ci --only=production --ignore-scripts

# Copy the compiled code from the build stage
COPY --from=build /app/dist /app

# generated prisma files
COPY --from=build /app/node_modules/.prisma /app/node_modules/.prisma

# Expose port 3333 defined in .env
EXPOSE 3333

# Make sure we don't run the container as root
USER node

# Pass environment variables to the container
# ENV PORT ${PORT}
# ENV SUPABASE_JWT_SECRET ${SUPABASE_JWT_SECRET}
# ENV COOKIE_NAME ${COOKIE_NAME}
# ENV COOKIE_SECRET ${COOKIE_SECRET}
# ENV DIRECT_URL ${DIRECT_URL}
# ENV DATABASE_URL ${DATABASE_URL}

# Start the application
CMD ["dumb-init", "node", "index.js"]
