import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module.js';
import { ValidationPipe } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // config swagger
  const config = new DocumentBuilder()
  .setTitle('Semantic Product Search API')
  .setDescription('API for semantic product search using OpenAI embeddings and Pinecone vector database')
  .setVersion('1.0')
  .addBearerAuth()
  .build();

  // create factory for swagger document
  const documentFactory = () => SwaggerModule.createDocument(app, config);

  // setup swagger module
  SwaggerModule.setup('docs', app, documentFactory());
  
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
    }),
  );
  await app.listen(process.env.PORT ?? 3000);
}
bootstrap();
