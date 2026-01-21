<template>
  <div>
    <h2>Clinics in {{ selectedProvince }}</h2>
    <ul>
      <li v-for="clinic in filteredClinics" :key="clinic.id">
        <strong>{{ clinic.name }}</strong><br />
        {{ clinic.address }} <br />
      </li>
    </ul>
  </div>
</template>

<script>
import { mapState, mapGetters } from 'vuex';

export default {
  name: 'ClinicList',
  computed: {
    ...mapState(['selectedProvince']),
    ...mapGetters(['getClinics']), // Map the getter that retrieves clinics from the Vuex store

    // Computed property to filter clinics based on the selected province
    filteredClinics() {
      return this.getClinics.filter(clinic => 
        clinic.province === this.selectedProvince || this.selectedProvince === 'All'
      );
    }
  }
};
</script>

<style scoped>
/* Add any necessary styles here */
.li {
  margin-bottom: 2px;
}

ul {
  list-style-type: none;
  padding-left: 0;
}

/* Add margin for the "no clinics" message */
.no-clinics-message {
  margin-left: 5px;
}
</style>



