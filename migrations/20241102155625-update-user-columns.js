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
    await queryInterface.changeColumn('Users', 'firstname', {
      type: Sequelize.STRING,
      allowNull: false,
      validate: {
        len: [2, 50],
      },
    });

    // Изменение колонки username
    await queryInterface.changeColumn('Users', 'username', {
      type: Sequelize.STRING,
      allowNull: false,
      unique: true,
      validate: {
        len: [2, 50],
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
    await queryInterface.changeColumn('Users', 'firstname', {
      type: Sequelize.STRING,
      allowNull: false,
      validate: {
        len: [3, 50], // Возвращаем значение до изменений
      },
    });

    // Откат изменений для колонки username
    await queryInterface.changeColumn('Users', 'username', {
      type: Sequelize.STRING,
      allowNull: false,
      unique: true,
      validate: {
        len: [2, 30], // Возвращаем значение до изменений
      },
    });
  },
};
