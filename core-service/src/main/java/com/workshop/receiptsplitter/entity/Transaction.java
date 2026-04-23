package com.workshop.receiptsplitter.entity;

import jakarta.persistence.CascadeType;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.FetchType;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.OneToMany;
import jakarta.persistence.Table;

import java.util.HashSet;
import java.util.Set;

@Entity
@Table(name = "transactions")
public class Transaction {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false)
    private String payer;

    @Column(name = "total_amount", nullable = false)
    private Double totalAmount;

    @Column(name = "is_paid", nullable = false)
    private boolean paid = false;

    // EAGER so items (and their assignments) serialize correctly outside a transaction.
    // Set instead of List avoids MultipleBagFetchException when nested EAGER collections exist.
    @OneToMany(mappedBy = "transaction", cascade = CascadeType.ALL, orphanRemoval = true, fetch = FetchType.EAGER)
    private Set<Item> items = new HashSet<>();

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }

    public String getPayer() { return payer; }
    public void setPayer(String payer) { this.payer = payer; }

    public Double getTotalAmount() { return totalAmount; }
    public void setTotalAmount(Double totalAmount) { this.totalAmount = totalAmount; }

    public boolean isPaid() { return paid; }
    public void setPaid(boolean paid) { this.paid = paid; }

    public Set<Item> getItems() { return items; }

    // Wires each incoming item back to this transaction so the FK is populated on save.
    public void setItems(Set<Item> items) {
        this.items.clear();
        if (items != null) {
            for (Item item : items) {
                item.setTransaction(this);
                this.items.add(item);
            }
        }
    }

    @Override
    public boolean equals(Object o) {
        if (this == o) return true;
        if (!(o instanceof Transaction)) return false;
        Transaction that = (Transaction) o;
        return id != null && id.equals(that.id);
    }

    @Override
    public int hashCode() {
        return getClass().hashCode();
    }
}
