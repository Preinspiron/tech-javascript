'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('Costs', {
      id: {
        type: Sequelize.INTEGER,
        autoIncrement: true,
        primaryKey: true,
        allowNull: false,
      },
      costDate: {
        type: Sequelize.DATEONLY,
        allowNull: false,
      },
      Campaign: {
        type: Sequelize.TEXT,
        allowNull: true,
      },
      Adset: {
        type: Sequelize.TEXT,
        allowNull: true,
      },
      Ad: {
        type: Sequelize.TEXT,
        allowNull: true,
      },
      FB_Id: {
        type: Sequelize.TEXT,
        allowNull: true,
      },
      'Cost.mod': {
        type: Sequelize.DECIMAL(12, 2),
        allowNull: true,
      },
      'Cost.mod.currency': {
        type: Sequelize.TEXT,
        allowNull: true,
      },
      'Cost.original': {
        type: Sequelize.DECIMAL(12, 2),
        allowNull: true,
      },
      'Cost.original.currency': {
        type: Sequelize.TEXT,
        allowNull: true,
      },
      Keitaro_Id: {
        type: Sequelize.INTEGER,
        allowNull: false,
      },
      Log: {
        type: Sequelize.TEXT,
        allowNull: true,
      },
      Status: {
        type: Sequelize.ENUM('new', 'applyed'),
        allowNull: false,
        defaultValue: 'new',
      },
      createdAt: {
        type: Sequelize.DATE,
        allowNull: false,
      },
      updatedAt: {
        type: Sequelize.DATE,
        allowNull: false,
      },
    });

    await queryInterface.addIndex('Costs', {
      unique: true,
      fields: ['Keitaro_Id', 'costDate', 'Campaign', 'Adset', 'Ad', 'FB_Id'],
      name: 'costs_unique_key',
    });
  },

  async down(queryInterface) {
    await queryInterface.removeIndex('Costs', 'costs_unique_key');
    await queryInterface.dropTable('Costs');
    await queryInterface.sequelize.query('DROP TYPE IF EXISTS "enum_Costs_Status";');
  },
};
