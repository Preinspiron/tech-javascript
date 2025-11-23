'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('Segments', {
      id: {
        type: Sequelize.UUID,
        primaryKey: true,
        allowNull: false,
        defaultValue: Sequelize.UUIDV4,
      },
      subid: {
        type: Sequelize.STRING,
        allowNull: true,
      },
      status: {
        type: Sequelize.STRING,
        allowNull: true,
      },
      value: {
        type: Sequelize.STRING,
        allowNull: true,
      },
      UA: {
        type: Sequelize.STRING(1200),
        allowNull: true,
      },
      origin: {
        type: Sequelize.STRING(500),
        allowNull: true,
      },
      client_ip_address: {
        type: Sequelize.STRING,
        allowNull: true,
      },
      external_id: {
        type: Sequelize.STRING,
        allowNull: true,
      },
      fbc: {
        type: Sequelize.STRING,
        allowNull: true,
      },
      fbp: {
        type: Sequelize.STRING,
        allowNull: true,
      },
      event: {
        type: Sequelize.STRING,
        allowNull: true,
      },
      type: {
        type: Sequelize.STRING,
        allowNull: true,
      },
      userId: {
        type: Sequelize.STRING,
        allowNull: true,
      },
      writeKey: {
        type: Sequelize.STRING,
        allowNull: true,
      },
      messageid: {
        type: Sequelize.STRING,
        allowNull: true,
      },
      pageUrl: {
        type: Sequelize.STRING(500),
        allowNull: true,
      },
      createdAt: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP'),
      },
      updatedAt: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP'),
      },
    });
  },

  async down(queryInterface) {
    await queryInterface.dropTable('Segments');
  },
};

