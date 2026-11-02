const adminService = require('../services/adminService');

const adminController = {
  async summary(req, res) {
    try {
      const metricas = await adminService.getSummary();
      const data = { metricas };
      return res.status(200).json({
        success: true,
        data,
        metricas,
      });
    } catch (error) {
      console.error('Error al consultar el resumen administrativo:', error);
      return res.status(500).json({
        message: 'Error interno del servidor al consultar el resumen administrativo.',
      });
    }
  },
};

module.exports = adminController;
