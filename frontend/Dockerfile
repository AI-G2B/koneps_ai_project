# koneps frontend (Vite build → nginx static + /api 프록시)
FROM node:20-alpine AS build

WORKDIR /app

# 빌드 시점에 API base URL 주입 (기본: /api → 같은 호스트 nginx가 backend로 프록시)
ARG VITE_API_BASE_URL=/api
ENV VITE_API_BASE_URL=$VITE_API_BASE_URL

# 의존성 캐시
COPY frontend/package*.json ./
RUN npm ci --no-audit --no-fund

# 빌드
COPY frontend ./
RUN npm run build

# ---------- runtime ----------
FROM nginx:alpine

# 디폴트 conf 제거 후 우리 conf 적용
RUN rm /etc/nginx/conf.d/default.conf
COPY frontend/nginx.conf /etc/nginx/conf.d/default.conf

# 빌드 산출물
COPY --from=build /app/dist /usr/share/nginx/html

EXPOSE 80
