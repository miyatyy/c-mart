# 1. Base Image
FROM node:20-alpine

# 2. Setup Working Directory
WORKDIR /app

# 3. Salin manifest package dan install production dependencies
COPY package*.json ./
RUN npm install --production

# 4. Salin seluruh source code backend
COPY . .

# 5. Expose port 5000
EXPOSE 5000

# 6. Default environment variable
ENV NODE_ENV=production
ENV PORT=5000

# 7. Script Start
CMD ["npm", "start"]
