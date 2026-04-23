package com.workshop.receiptsplitter.service;

import com.workshop.receiptsplitter.entity.Assignment;
import com.workshop.receiptsplitter.entity.Item;
import com.workshop.receiptsplitter.entity.Transaction;
import com.workshop.receiptsplitter.repository.TransactionRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Service
public class TransactionService {

    // Floating-point tolerance when comparing the client-supplied total against
    // the sum of item totalPrices — guards against sub-cent rounding differences.
    private static final double AMOUNT_TOLERANCE = 0.01;

    private final TransactionRepository repository;

    public TransactionService(TransactionRepository repository) {
        this.repository = repository;
    }

    @Transactional(readOnly = true)
    public List<Transaction> findAll() {
        return repository.findAll();
    }

    @Transactional
    public Transaction save(Transaction transaction) {
        // Manually wire up bidirectional references to ensure foreign keys are populated correctly,
        // especially if Jackson bypassed the setters when populating existing collections.
        if (transaction.getItems() != null) {
            for (Item item : transaction.getItems()) {
                item.setTransaction(transaction);
                if (item.getAssignments() != null) {
                    for (Assignment assignment : item.getAssignments()) {
                        assignment.setItem(item);
                    }
                }
            }
        }

        validateBasicFields(transaction);
        validateTotalAmount(transaction);
        validateAssignmentQuantities(transaction);
        return repository.save(transaction);
    }

    @Transactional
    public Transaction markAsPaid(Long id) {
        Transaction t = repository.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("Transaction not found: " + id));
        t.setPaid(true);
        return repository.save(t);
    }

    @Transactional
    public void delete(Long id) {
        if (!repository.existsById(id)) {
            throw new IllegalArgumentException("Transaction not found: " + id);
        }
        repository.deleteById(id);
    }

    private void validateBasicFields(Transaction t) {
        if (t.getPayer() == null || t.getPayer().isBlank()) {
            throw new IllegalArgumentException("payer must be provided");
        }
        if (t.getItems() == null || t.getItems().isEmpty()) {
            throw new IllegalArgumentException("transaction must contain at least one item");
        }
        if (t.getTotalAmount() == null) {
            throw new IllegalArgumentException("totalAmount must be provided");
        }
        
        for (Item item : t.getItems()) {
            if (item.getName() == null || item.getName().isBlank()) {
                throw new IllegalArgumentException("item name must be provided");
            }
            if (item.getUnitPrice() == null) {
                throw new IllegalArgumentException("unitPrice must be provided for item: " + item.getName());
            }
            if (item.getTotalPrice() == null) {
                throw new IllegalArgumentException("totalPrice must be provided for item: " + item.getName());
            }
        }
    }

    private void validateTotalAmount(Transaction t) {
        double itemsSum = t.getItems().stream()
                .mapToDouble(Item::getTotalPrice)
                .sum();
        if (Math.abs(itemsSum - t.getTotalAmount()) > AMOUNT_TOLERANCE) {
            throw new IllegalArgumentException(
                    "totalAmount (" + t.getTotalAmount()
                            + ") does not match sum of item totalPrices (" + itemsSum + ")");
        }
    }

    private void validateAssignmentQuantities(Transaction t) {
        for (Item item : t.getItems()) {
            if (item.getAssignments() != null) {
                int totalAssigned = item.getAssignments().stream()
                        .mapToInt(Assignment::getQuantity)
                        .sum();
                if (totalAssigned > item.getQuantity()) {
                    throw new IllegalArgumentException(
                            "Assigned quantities (" + totalAssigned
                                    + ") exceed item quantity (" + item.getQuantity()
                                    + ") for item: " + item.getName());
                }
            }
        }
    }
}
