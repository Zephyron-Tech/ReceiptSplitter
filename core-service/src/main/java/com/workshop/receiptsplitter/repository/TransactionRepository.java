package com.workshop.receiptsplitter.repository;

import com.workshop.receiptsplitter.entity.Transaction;
import org.springframework.data.jpa.repository.JpaRepository;

public interface TransactionRepository extends JpaRepository<Transaction, Long> {
}
