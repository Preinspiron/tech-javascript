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
    await queryInterface.changeColumn('Users', 'password', {
      type: Sequelize.STRING,
      allowNull: false,
      validate: {
        len: [8, 100],
        is: /^(?=.*[A-Za-z])(?=.*\d)(?=.*[!@#$%^&*(),.?":{}|<>]).{8,}$/,
      },
    });
  },

  async down(queryInterface, Sequelize) {
    /**
     * Add reverting commands here.
     *
     * Example:
     * await queryInterface.dropTable('users');
     */
    await queryInterface.changeColumn('Users', 'password', {
      type: Sequelize.STRING,
      allowNull: false,
      validate: {
        len: [8, 100],
      },
    });
  },
};
