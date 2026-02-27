/**
 * WebSocket Service - VetPro
 * Implementa comunicação em tempo real para notificações
 */

const jwt = require('jsonwebtoken');
const logger = require('../utils/logger');

class WebSocketService {
  constructor() {
    this.io = null;
    this.connectedUsers = new Map(); // userId -> socketId
  }

  /**
   * Inicializa o servidor WebSocket
   * @param {Object} server - Servidor HTTP Node.js
   */
  initialize(server) {
    const { Server } = require('socket.io');

    this.io = new Server(server, {
      cors: {
        origin: process.env.CORS_ORIGIN || '*',
        methods: ['GET', 'POST'],
      },
      pingTimeout: 60000,
      pingInterval: 25000,
    });

    // Middleware de autenticação
    this.io.use((socket, next) => {
      const { token } = socket.handshake.auth;
      if (!token) {
        return next(new Error('Authentication required'));
      }

      try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        socket.user = {
          ...decoded,
          id: decoded.userId || decoded.id || null,
        };
        next();
      } catch (error) {
        next(new Error('Invalid token'));
      }
    });

    // Conexão de clientes
    this.io.on('connection', (socket) => {
      logger.info('Cliente WebSocket conectado', {
        socketId: socket.id,
        userId: socket.user?.id,
        clinicId: socket.user?.clinicId,
      });

      // Registrar usuário conectado
      if (socket.user?.id) {
        this.connectedUsers.set(socket.user.id, socket.id);
        // Unir à sala da clínica
        if (socket.user.clinicId) {
          socket.join(`clinic:${socket.user.clinicId}`);
        }
      }

      // Evento: join room
      socket.on('join:clinic', (clinicId) => {
        socket.join(`clinic:${clinicId}`);
        logger.debug('Socket entrou na sala da clínica', {
          socketId: socket.id,
          clinicId,
        });
      });

      // Evento: join consultation room
      socket.on('join:consultation', (consultationId) => {
        socket.join(`consultation:${consultationId}`);
        logger.debug('Socket entrou na sala de consulta', {
          socketId: socket.id,
          consultationId,
        });
      });

      // Evento: leave consultation
      socket.on('leave:consultation', (consultationId) => {
        socket.leave(`consultation:${consultationId}`);
      });

      // Evento: typing indicator
      socket.on('typing:start', (data) => {
        socket.to(`consultation:${data.consultationId}`).emit('user:typing', {
          userId: socket.user.id,
          userName: socket.user.name,
        });
      });

      socket.on('typing:stop', (data) => {
        socket
          .to(`consultation:${data.consultationId}`)
          .emit('user:stop-typing', {
            userId: socket.user.id,
          });
      });

      // Desconexão
      socket.on('disconnect', (reason) => {
        logger.info('Cliente WebSocket desconectado', {
          socketId: socket.id,
          userId: socket.user?.id,
          reason,
        });
        if (socket.user?.id) {
          this.connectedUsers.delete(socket.user.id);
        }
      });
    });

    logger.info('WebSocket Server inicializado com sucesso');
  }

  /**
   * Notifica atualização de paciente
   */
  notifyPatientUpdate(clinicId, patient, action = 'updated') {
    if (!this.io) return;
    this.io.to(`clinic:${clinicId}`).emit('patient:update', {
      action,
      patient: this.sanitizePatient(patient),
      timestamp: new Date().toISOString(),
    });
  }

  /**
   * Notifica nova consulta criada
   */
  notifyNewConsultation(clinicId, consultation) {
    if (!this.io) return;
    this.io.to(`clinic:${clinicId}`).emit('consultation:new', {
      consultation: this.sanitizeConsultation(consultation),
      timestamp: new Date().toISOString(),
    });
  }

  /**
   * Notifica atualização de consulta em tempo real
   */
  notifyConsultationUpdate(consultationId, data) {
    if (!this.io) return;
    this.io.to(`consultation:${consultationId}`).emit('consultation:update', {
      ...data,
      timestamp: new Date().toISOString(),
    });
  }

  /**
   * Envia notificação para usuário específico
   */
  notifyUser(userId, event, data) {
    if (!this.io) return;
    const socketId = this.connectedUsers.get(userId);
    if (socketId) {
      this.io.to(socketId).emit(event, data);
    }
  }

  /**
   * Notifica todos na clínica
   */
  broadcastToClinic(clinicId, event, data) {
    if (!this.io) return;
    this.io.to(`clinic:${clinicId}`).emit(event, data);
  }

  /**
   * Sanitiza dados do paciente para envio
   */
  sanitizePatient(patient) {
    if (!patient) return null;
    const { password, ...safe } = patient;
    return safe;
  }

  /**
   * Sanitiza dados da consulta
   */
  sanitizeConsultation(consultation) {
    if (!consultation) return null;
    // Remove campos sensíveis se necessário
    return consultation;
  }

  /**
   * Obtém usuários online na clínica
   */
  getOnlineUsers(clinicId) {
    if (!this.io) return [];
    const room = this.io.sockets.adapter.rooms.get(`clinic:${clinicId}`);
    if (!room) return [];
    return Array.from(room).map((socketId) => {
      const socket = this.io.sockets.sockets.get(socketId);
      return {
        socketId,
        userId: socket?.user?.id,
        userName: socket?.user?.name,
      };
    });
  }
}

// Singleton instance
module.exports = new WebSocketService();
