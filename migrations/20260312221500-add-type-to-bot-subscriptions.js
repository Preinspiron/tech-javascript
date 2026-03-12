'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.addColumn('BotSubscriptions', 'type', {
      type: Sequelize.STRING,
      allowNull: false,
      defaultValue: 'offer',
    });
  },

  async down(queryInterface) {
    await queryInterface.removeColumn('BotSubscriptions', 'type');
  },
};

