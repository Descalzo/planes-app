import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  OnGatewayConnection,
  OnGatewayDisconnect,
  ConnectedSocket,
  MessageBody,
  WsException,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { JwtService } from '@nestjs/jwt';
import { MessagesService } from '../messages/messages.service';
import { PrivateActivityMessagesService } from '../private-activity-messages/private-activity-messages.service';
import { getAllowedOrigins } from '../config/cors';

@WebSocketGateway({ cors: { origin: getAllowedOrigins(), credentials: true } })
export class ChatGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server;

  constructor(
    private readonly jwtService: JwtService,
    private readonly messagesService: MessagesService,
    private readonly privateMessagesService: PrivateActivityMessagesService,
  ) {}

  private getUserId(client: Socket): string | null {
    const token = client.handshake.auth?.token as string | undefined;
    if (!token) return null;
    try {
      const payload = this.jwtService.verify<{ sub: string }>(token);
      return payload.sub ?? null;
    } catch {
      return null;
    }
  }

  handleConnection(client: Socket) {
    const userId = this.getUserId(client);
    if (!userId) {
      client.disconnect();
      return;
    }
    client.data.userId = userId;
  }

  handleDisconnect(_client: Socket) {
    // rooms are cleaned up automatically by socket.io on disconnect
  }

  // ─── General chat ─────────────────────────────────────────────────────────

  @SubscribeMessage('joinActivityChat')
  async handleJoinActivityChat(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { activityId: string },
  ) {
    const userId: string = client.data.userId;
    const { activityId } = data;

    const canAccess = await this.messagesService.checkChatAccess(activityId, userId);
    if (!canAccess) {
      throw new WsException('No tienes permiso para acceder a este chat');
    }

    await client.join(`activity:${activityId}`);
    // Mark user as active (suppresses push notifications)
    await this.messagesService.markUserActiveInGeneralChat(activityId, userId);
    return { ok: true };
  }

  @SubscribeMessage('leaveActivityChat')
  handleLeaveActivityChat(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { activityId: string },
  ) {
    client.leave(`activity:${data.activityId}`);
    return { ok: true };
  }

  @SubscribeMessage('sendActivityMessage')
  async handleSendActivityMessage(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { activityId: string; text: string },
  ) {
    const userId: string = client.data.userId;
    const { activityId, text } = data;

    if (!text?.trim()) throw new WsException('El mensaje no puede estar vacío');

    try {
      const message = await this.messagesService.create(activityId, userId, { text: text.trim() });
      this.server.to(`activity:${activityId}`).emit('newActivityMessage', message);
      return { ok: true };
    } catch (error: any) {
      throw new WsException(error?.message ?? 'No se pudo enviar el mensaje');
    }
  }

  // ─── Private chat ──────────────────────────────────────────────────────────

  private privateRoomName(activityId: string, userA: string, userB: string) {
    return `private:${activityId}:${[userA, userB].sort().join(':')}`;
  }

  @SubscribeMessage('joinPrivateChat')
  async handleJoinPrivateChat(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { activityId: string; otherUserId: string },
  ) {
    const userId: string = client.data.userId;
    const { activityId, otherUserId } = data;

    const canAccess = await this.privateMessagesService.checkPrivateChatAccess(
      activityId,
      userId,
      otherUserId,
    );
    if (!canAccess) {
      throw new WsException('No tienes permiso para acceder a este chat privado');
    }

    const room = this.privateRoomName(activityId, userId, otherUserId);
    await client.join(room);
    // Mark viewer as active (suppresses push notifications)
    await this.privateMessagesService.markConversationActive(activityId, otherUserId, userId);
    return { ok: true };
  }

  @SubscribeMessage('leavePrivateChat')
  handleLeavePrivateChat(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { activityId: string; otherUserId: string },
  ) {
    const userId: string = client.data.userId;
    const room = this.privateRoomName(data.activityId, userId, data.otherUserId);
    client.leave(room);
    return { ok: true };
  }

  @SubscribeMessage('sendPrivateMessage')
  async handleSendPrivateMessage(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { activityId: string; text: string; receiverId?: string },
  ) {
    const userId: string = client.data.userId;
    const { activityId, text, receiverId } = data;

    if (!text?.trim()) throw new WsException('El mensaje no puede estar vacío');

    try {
      const message = await this.privateMessagesService.create(activityId, userId, {
        text: text.trim(),
        receiverId,
      });

      const populated = message as any;
      const senderId = populated.sender?._id?.toString() ?? populated.sender?.toString();
      const recvId = populated.receiver?._id?.toString() ?? populated.receiver?.toString();

      const room = this.privateRoomName(activityId, senderId, recvId);
      this.server.to(room).emit('newPrivateMessage', message);
      return { ok: true, message };
    } catch (error: any) {
      throw new WsException(error?.message ?? 'No se pudo enviar el mensaje');
    }
  }
}
