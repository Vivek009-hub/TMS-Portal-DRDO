import fundManagementRepository from '../repositories/fundManagementRepository.js';
import fundExpenditureItemRepository from '../repositories/fundExpenditureItemRepository.js';
import courseRepository from '../repositories/courseRepository.js';
import { NotFoundError } from '../utils/errors.js';

const fundManagementService = {
  /** "Amount Paid by Cash" and "Cash Refunded (Drawn - Spent in Cash)" are spec-defined
   * formulas, not free-entry fields — computed here from the expenditure line items rather
   * than stored, so they can never drift out of sync with the underlying entries. */
  async getForCourse(courseId) {
    const course = await courseRepository.findById(courseId);
    if (!course) throw new NotFoundError('Course not found');
    const fundManagement = await fundManagementRepository.findByCourse(courseId);
    const items = await fundExpenditureItemRepository.findAllByCourse(courseId);

    const totalExpenditure = items.reduce((sum, i) => sum + Number(i.amount), 0);
    const amountPaidByCash = items
      .filter((i) => (i.mode_of_payment || '').trim().toLowerCase() === 'cash')
      .reduce((sum, i) => sum + Number(i.amount), 0);
    const cashRefunded = fundManagement?.cash_drawn_amount != null
      ? Math.round((Number(fundManagement.cash_drawn_amount) - amountPaidByCash) * 100) / 100
      : null;

    return { fundManagement, items, totalExpenditure, amountPaidByCash, cashRefunded };
  },

  async saveSanction(courseId, data) {
    const course = await courseRepository.findById(courseId);
    if (!course) throw new NotFoundError('Course not found');
    return fundManagementRepository.upsertForCourse(courseId, data);
  },

  async addItem(courseId, data) {
    const course = await courseRepository.findById(courseId);
    if (!course) throw new NotFoundError('Course not found');
    return fundExpenditureItemRepository.create(courseId, data);
  },

  async updateItem(id, data) {
    const item = await fundExpenditureItemRepository.findById(id);
    if (!item) throw new NotFoundError('Expenditure item not found');
    return fundExpenditureItemRepository.update(id, data);
  },

  async deleteItem(id) {
    const item = await fundExpenditureItemRepository.findById(id);
    if (!item) throw new NotFoundError('Expenditure item not found');
    await fundExpenditureItemRepository.delete(id);
    return { message: 'Expenditure item deleted' };
  },
};

export default fundManagementService;
