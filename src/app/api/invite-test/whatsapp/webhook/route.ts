/**
 * Прежний адрес вебхука WhatsApp. Инстансы, где он уже прописан, продолжают
 * работать: обработчик теперь общий для всех каналов GREEN-API и лежит в
 * `/api/invite-test/green/webhook`.
 */
export { POST } from '../../green/webhook/route'
