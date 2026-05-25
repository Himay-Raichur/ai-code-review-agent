class EmbeddingService:
    def create_embedding(self, text: str):
        return [0.0] * 384

embedding_service = EmbeddingService()