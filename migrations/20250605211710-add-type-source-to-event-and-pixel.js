'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    /**
     * Add altering commands here.
     *
     * Example:
     * await queryInterface.createTable('users', { id: Sequelize.INTEGER });
     */
    await queryInterface.addColumn('Pixels', 'type_source', {
      type: Sequelize.STRING,
      allowNull: true,
    });

    await queryInterface.addColumn('Events', 'type_source', {
      type: Sequelize.STRING,
      allowNull: true,
    });
  },

  async down(queryInterface) {
    /**
     * Add reverting commands here.
     *
     * Example:
     * await queryInterface.dropTable('users');
     */
    await queryInterface.removeColumn('Events', 'type_source');

    await queryInterface.removeColumn('Pixels', 'type_source');
  },
};
