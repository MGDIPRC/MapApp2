<template>
  <div class="filters">
    <div>
      <input type="checkbox" id="adult" v-model="filters.adult" />
      <label for="adult">Adult</label>
    </div>
    <div>
      <input type="checkbox" id="pediatric" v-model="filters.pediatric" />
      <label for="pediatric">Pediatric</label>
    </div>
    <div>
      <input type="checkbox" id="multidisciplinary" v-model="filters.multidisciplinary" />
      <label for="multidisciplinary">Multidisciplinary</label>
    </div>
  </div>
</template>

<script>
export default {
  name: 'FilterComponent',
  data() {
    return {
      filters: {
        adult: false,
        pediatric: false,
        multidisciplinary: false
      }
    };
  },
  methods: {
    // Add methods to handle filter changes
  }
};
</script>

<style scoped>
.filters {
  padding: 10px;
  background-color: #f5f5f5;
}
</style>


