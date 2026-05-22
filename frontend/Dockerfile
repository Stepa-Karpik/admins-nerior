FROM node:20-alpine AS deps
WORKDIR /app
COPY package.json package-lock.json* ./
RUN npm install

FROM node:20-alpine AS builder
WORKDIR /app
ARG NEXT_PUBLIC_API_BASE_URL=/api/v1
ARG NEXT_PUBLIC_AUTH_URL=https://auth.nerior.ru/login
ARG NEXT_PUBLIC_PLANNER_URL=https://planner.nerior.ru
ARG NEXT_PUBLIC_DOCUMENTS_URL=https://documents.nerior.ru
ENV NEXT_PUBLIC_API_BASE_URL=$NEXT_PUBLIC_API_BASE_URL
ENV NEXT_PUBLIC_AUTH_URL=$NEXT_PUBLIC_AUTH_URL
ENV NEXT_PUBLIC_PLANNER_URL=$NEXT_PUBLIC_PLANNER_URL
ENV NEXT_PUBLIC_DOCUMENTS_URL=$NEXT_PUBLIC_DOCUMENTS_URL
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN npm run build

FROM node:20-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
COPY --from=builder /app/package.json ./package.json
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/.next ./.next
COPY --from=builder /app/public ./public
EXPOSE 3000
CMD ["npm", "run", "start"]
