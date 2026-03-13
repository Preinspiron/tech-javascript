'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.addColumn('BotSubscriptions', 'costPercent', {
      type: Sequelize.INTEGER,
      allowNull: true,
      comment: 'Optional markup percent applied to cost metrics',
    });
  },

  async down(queryInterface) {
    await queryInterface.removeColumn('BotSubscriptions', 'costPercent');
  },
};

